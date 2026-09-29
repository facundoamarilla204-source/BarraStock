import { prisma } from './db'

export type CarritoItem = {
  tipo: 'producto' | 'receta'
  id: string // ID del Producto o Receta
  cantidad: number
}

export const getVentas = async () => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  return await prisma.venta.findMany({
    where: {
      fecha: {
        gte: startOfDay
      }
    },
    include: {
      detalles: {
        include: {
          producto: true,
          receta: true
        }
      }
    },
    orderBy: {
      fecha: 'desc'
    }
  })
}

/**
 * Calcula cuánto stock se descuenta al vender un producto como unidad cerrada.
 * - Si tiene tamañoEnvase (ej: botella de 1000ml): descuenta tamañoEnvase por cada unidad vendida
 * - Si es "unidad" simple (ej: lata, golosina): descuenta 1 por unidad vendida
 */
function calcularDescuentoProductoCerrado(producto: {
  unidadMedida: string
  tamanioEnvase: number | null
}): number {
  if (producto.tamanioEnvase && producto.unidadMedida !== 'unidad') {
    return producto.tamanioEnvase
  }
  return 1
}

export async function procesarVenta(carrito: CarritoItem[], medioPago: string = 'efectivo', montoRecibido?: number, vuelto?: number, costoDelivery?: number) {
  if (carrito.length === 0 && !costoDelivery) {
    throw new Error('El carrito está vacío.')
  }

  // Verificar caja abierta
  const cajaAbierta = await prisma.cajaSesion.findFirst({
    where: { estado: 'abierta' }
  })
  
  if (!cajaAbierta) {
    throw new Error('Debes abrir una caja primero.')
  }

  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  const ivaActivo = config?.ivaActivo ?? false
  const ivaPorcentaje = config?.ivaPorcentaje ?? 21
  const porcentajeDelivery = config?.porcentajeDelivery ?? 100
  const deliveryMonto = costoDelivery || 0
  const pagoDelivery = deliveryMonto * (porcentajeDelivery / 100)

  // Ejecutamos la venta en una transacción para asegurar atomicidad
  return await prisma.$transaction(async (tx) => {
    let totalVenta = deliveryMonto
    let totalGananciaBruta: number | null = 0
    const detallesData: any[] = []

    for (const item of carrito) {
      if (item.cantidad <= 0) {
        throw new Error('La cantidad de un ítem debe ser mayor a 0.')
      }

      if (item.tipo === 'producto') {
        // Venta de producto como unidad cerrada
        const producto = await tx.producto.findUnique({ where: { id: item.id } })
        if (!producto) throw new Error(`Producto no encontrado: ${item.id}`)
        if (!producto.activo) throw new Error(`El producto ${producto.nombre} no está activo.`)

        const descuentoPorUnidad = calcularDescuentoProductoCerrado(producto)
        const descuentoTotal = descuentoPorUnidad * item.cantidad

        if (producto.stock < descuentoTotal) {
          const unidadesDisponibles = producto.tamanioEnvase
            ? Math.floor(producto.stock / producto.tamanioEnvase)
            : producto.stock
          throw new Error(
            `Stock insuficiente para el producto ${producto.nombre}. Disponible: ${unidadesDisponibles} unidad(es), Solicitado: ${item.cantidad}`
          )
        }

        // Descontar stock (en unidad base: ml, gr, o unidades)
        await tx.producto.update({
          where: { id: producto.id },
          data: { stock: { decrement: descuentoTotal } }
        })

        const subtotalNeto = producto.precio * item.cantidad
        const itemIva = ivaActivo ? subtotalNeto * (ivaPorcentaje / 100) : 0
        const subtotal = subtotalNeto + itemIva
        totalVenta += subtotal

        const costoU = producto.costo > 0 ? producto.costo : null
        const ganancia = costoU !== null ? subtotalNeto - (costoU * item.cantidad) : null
        if (ganancia !== null && totalGananciaBruta !== null) totalGananciaBruta += ganancia

        detallesData.push({
          tipo: 'producto',
          productoId: producto.id,
          cantidad: item.cantidad,
          precioUnitario: producto.precio + (ivaActivo ? producto.precio * (ivaPorcentaje / 100) : 0),
          subtotal,
          neto: subtotalNeto,
          iva: itemIva,
          costoUnitario: costoU,
          ganancia
        })
      } else if (item.tipo === 'receta') {
        // Venta de receta (trago/combo)
        const receta = await tx.receta.findUnique({
          where: { id: item.id },
          include: {
            items: {
              include: { producto: true }
            }
          }
        })
        if (!receta) throw new Error(`Receta no encontrada: ${item.id}`)
        if (!receta.activa) throw new Error(`La receta ${receta.nombre} no está activa.`)

        // Descontar stock de los componentes de la receta
        for (const subItem of receta.items) {
          const cantidadNecesaria = subItem.cantidad * item.cantidad

          if (subItem.producto.stock < cantidadNecesaria) {
            throw new Error(
              `Stock insuficiente de ${subItem.producto.nombre} para la receta ${receta.nombre}. Disponible: ${subItem.producto.stock} ${subItem.producto.unidadMedida}, Solicitado: ${cantidadNecesaria}`
            )
          }

          await tx.producto.update({
            where: { id: subItem.producto.id },
            data: { stock: { decrement: cantidadNecesaria } }
          })
        }

        let costoRecetaUnitario: number | null = 0;
        let todosTienenCosto = true;
        for (const subItem of receta.items) {
          if (!subItem.producto.costo || subItem.producto.costo <= 0) {
            todosTienenCosto = false;
          } else {
            if (costoRecetaUnitario !== null) {
              costoRecetaUnitario += subItem.producto.costo * subItem.cantidad;
            }
          }
        }
        if (!todosTienenCosto || receta.items.length === 0) {
          costoRecetaUnitario = null;
        }

        const subtotalNeto = receta.precio * item.cantidad
        const itemIva = ivaActivo ? subtotalNeto * (ivaPorcentaje / 100) : 0
        const subtotal = subtotalNeto + itemIva
        totalVenta += subtotal

        const ganancia = costoRecetaUnitario !== null ? subtotalNeto - (costoRecetaUnitario * item.cantidad) : null
        if (ganancia !== null && totalGananciaBruta !== null) totalGananciaBruta += ganancia

        detallesData.push({
          tipo: 'receta',
          recetaId: receta.id,
          cantidad: item.cantidad,
          precioUnitario: receta.precio + (ivaActivo ? receta.precio * (ivaPorcentaje / 100) : 0),
          subtotal,
          neto: subtotalNeto,
          iva: itemIva,
          costoUnitario: costoRecetaUnitario,
          ganancia
        })
      }
    }

    // Determinar el próximo número de venta
    const maxVenta = await tx.venta.findFirst({
      orderBy: { numero: 'desc' }
    })
    const nextNumero = (maxVenta?.numero || 0) + 1

    // Calcular totales de IVA
    const totalNeto = detallesData.reduce((acc, d) => acc + d.neto, 0)
    const totalIva = detallesData.reduce((acc, d) => acc + d.iva, 0)

    // Crear la venta
    const venta = await tx.venta.create({
      data: {
        numero: nextNumero,
        cajaSesionId: cajaAbierta.id,
        total: totalVenta,
        neto: totalNeto,
        iva: totalIva,
        ivaPorcentaje: ivaActivo ? ivaPorcentaje : null,
        costoDelivery: deliveryMonto,
        pagoDelivery: pagoDelivery,
        medioPago,
        estado: 'activa',
        montoRecibido: medioPago === 'efectivo' ? montoRecibido : null,
        vuelto: medioPago === 'efectivo' ? vuelto : null,
        gananciaBruta: totalGananciaBruta,
        detalles: {
          create: detallesData
        }
      },
      include: {
        detalles: true
      }
    })

    return venta
  })
}

export async function anularVenta(ventaId: string, motivo: string = 'Error de carga') {
  return await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({
      where: { id: ventaId },
      include: {
        detalles: {
          include: {
            producto: true,
            receta: {
              include: {
                items: {
                  include: { producto: true }
                }
              }
            }
          }
        }
      }
    })

    if (!venta) throw new Error('Venta no encontrada.')
    if (venta.estado === 'anulada') throw new Error('La venta ya se encuentra anulada.')

    // Reponer stock
    for (const detalle of venta.detalles) {
      if (detalle.tipo === 'producto' && detalle.productoId && detalle.producto) {
        // Reponer stock de producto vendido como unidad cerrada
        const incrementoPorUnidad = calcularDescuentoProductoCerrado(detalle.producto)
        const incrementoTotal = incrementoPorUnidad * detalle.cantidad

        await tx.producto.update({
          where: { id: detalle.productoId },
          data: { stock: { increment: incrementoTotal } }
        })
      } else if (detalle.tipo === 'receta' && detalle.receta) {
        // Reponer stock de cada componente de la receta
        for (const subItem of detalle.receta.items) {
          const cantidadAReponer = subItem.cantidad * detalle.cantidad
          await tx.producto.update({
            where: { id: subItem.productoId },
            data: { stock: { increment: cantidadAReponer } }
          })
        }
      }
    }

    // Marcar como anulada
    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: 'anulada',
        anuladaEn: new Date(),
        motivoAnulacion: motivo
      }
    })

    return ventaActualizada
  })
}

export async function getDashboardMetrics() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const ventas = await prisma.venta.findMany({
    where: {
      fecha: { gte: startOfDay },
      estado: 'activa'
    },
    include: {
      detalles: {
        include: {
          producto: true,
          receta: true
        }
      }
    }
  })

  let totalEfectivo = 0
  let totalTransferencia = 0
  let totalGananciaBruta = 0
  const itemsMap = new Map<string, { nombre: string, cantidad: number, totalFacturado: number }>()

  for (const v of ventas) {
    if (v.medioPago.toLowerCase() === 'efectivo') {
      totalEfectivo += v.total
    } else {
      totalTransferencia += v.total
    }
    
    if (v.gananciaBruta) {
      totalGananciaBruta += v.gananciaBruta
    }

    for (const d of v.detalles) {
      const id = d.tipo === 'producto' ? d.productoId! : d.recetaId!
      const nombre = d.tipo === 'producto' ? d.producto!.nombre : d.receta!.nombre

      if (!itemsMap.has(id)) {
        itemsMap.set(id, { nombre, cantidad: 0, totalFacturado: 0 })
      }
      
      const item = itemsMap.get(id)!
      item.cantidad += d.cantidad
      item.totalFacturado += d.subtotal
    }
  }

  const topItems = Array.from(itemsMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  return {
    totalEfectivo,
    totalTransferencia,
    totalGananciaBruta,
    topItems
  }
}

export async function getReporteAvanzado(fechaDesde: Date, fechaHasta: Date) {
  // Asegurarnos de que fechaHasta cubra todo el día (hasta las 23:59:59)
  const fechaFin = new Date(fechaHasta)
  fechaFin.setHours(23, 59, 59, 999)

  const ventas = await prisma.venta.findMany({
    where: {
      fecha: {
        gte: fechaDesde,
        lte: fechaFin
      },
      estado: 'activa'
    },
    include: {
      detalles: {
        include: {
          producto: true,
          receta: true
        }
      }
    }
  })

  let totalRecaudado = 0
  let totalEfectivo = 0
  let totalTransferencia = 0
  let totalNeto = 0
  let totalIva = 0
  let cantidadVentas = ventas.length

  let totalGananciaBruta = 0
  let totalCostoMercaderia = 0
  let tieneCostosIncompletos = false

  const itemsMap = new Map<string, { nombre: string, tipo: string, cantidad: number, totalFacturado: number, totalCosto: number, totalGanancia: number, costoIncompleto: boolean }>()

  for (const v of ventas) {
    totalRecaudado += v.total
    totalNeto += v.neto ?? v.total
    totalIva += v.iva ?? 0

    if (v.medioPago.toLowerCase() === 'efectivo') {
      totalEfectivo += v.total
    } else {
      totalTransferencia += v.total
    }

    if (v.gananciaBruta !== null) {
      totalGananciaBruta += v.gananciaBruta
    }

    for (const d of v.detalles) {
      const id = d.tipo === 'producto' ? d.productoId! : d.recetaId!
      const nombre = d.tipo === 'producto' ? d.producto!.nombre : d.receta!.nombre
      const tipo = d.tipo === 'producto' ? 'Producto' : (d.receta!.categoria || 'Receta')

      if (d.costoUnitario === null || d.ganancia === null) {
        tieneCostosIncompletos = true
      } else {
        totalCostoMercaderia += (d.costoUnitario * d.cantidad)
      }

      if (!itemsMap.has(id)) {
        itemsMap.set(id, { nombre, tipo, cantidad: 0, totalFacturado: 0, totalCosto: 0, totalGanancia: 0, costoIncompleto: false })
      }
      
      const item = itemsMap.get(id)!
      item.cantidad += d.cantidad
      item.totalFacturado += d.subtotal
      if (d.costoUnitario === null || d.ganancia === null) {
        item.costoIncompleto = true
      } else {
        item.totalCosto += (d.costoUnitario * d.cantidad)
        item.totalGanancia += d.ganancia
      }
    }
  }

  const ticketPromedio = cantidadVentas > 0 ? totalRecaudado / cantidadVentas : 0

  const ranking = Array.from(itemsMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)

  return {
    totalRecaudado,
    totalNeto,
    totalIva,
    totalEfectivo,
    totalTransferencia,
    totalGananciaBruta,
    totalCostoMercaderia,
    tieneCostosIncompletos,
    cantidadVentas,
    ticketPromedio,
    ranking,
    fechaDesde,
    fechaHasta
  }
}
