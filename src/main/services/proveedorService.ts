import { prisma } from './db'

export async function getProveedores(filtros?: { search?: string; tipo?: string; estado?: string }) {
  const where: any = {}
  
  if (filtros?.estado === 'activo') {
    where.activo = true
  } else if (filtros?.estado === 'inactivo') {
    where.activo = false
  }
  
  if (filtros?.tipo && filtros.tipo !== 'Todos') {
    where.tipo = filtros.tipo
  }

  if (filtros?.search) {
    const search = filtros.search
    where.OR = [
      { razonSocial: { contains: search } },
      { cuit: { contains: search } },
      { contacto: { contains: search } }
    ]
  }

  const proveedores = await prisma.proveedor.findMany({
    where,
    orderBy: { razonSocial: 'asc' },
    include: {
      _count: {
        select: { compras: true, pagos: true }
      }
    }
  })

  // Agregamos saldo pendiente calculando la suma de movimientos
  const proveedoresConSaldo = await Promise.all(proveedores.map(async (p) => {
    const ultimoMovimiento = await prisma.proveedorMovimiento.findFirst({
      where: { proveedorId: p.id },
      orderBy: { fecha: 'desc' }
    })
    return {
      ...p,
      saldoPendiente: ultimoMovimiento ? ultimoMovimiento.saldoResultante : 0
    }
  }))

  return proveedoresConSaldo
}

export async function getProveedorById(id: string) {
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      compras: {
        orderBy: { fecha: 'desc' },
        take: 10
      },
      pagos: {
        orderBy: { fecha: 'desc' },
        take: 10
      },
      productos: {
        include: { producto: true }
      }
    }
  })

  if (!proveedor) return null

  const ultimoMovimiento = await prisma.proveedorMovimiento.findFirst({
    where: { proveedorId: id },
    orderBy: { fecha: 'desc' }
  })

  return {
    ...proveedor,
    saldoPendiente: ultimoMovimiento ? ultimoMovimiento.saldoResultante : 0
  }
}

export async function createProveedor(data: any) {
  return await prisma.proveedor.create({
    data: {
      razonSocial: data.razonSocial,
      cuit: data.cuit,
      contacto: data.contacto,
      telefono: data.telefono,
      whatsapp: data.whatsapp,
      email: data.email,
      direccion: data.direccion,
      localidad: data.localidad,
      tipo: data.tipo,
      condicionPago: data.condicionPago,
      diasVencimiento: data.diasVencimiento,
      limiteCredito: data.limiteCredito,
      notas: data.notas,
      activo: data.activo !== undefined ? data.activo : true
    }
  })
}

export async function updateProveedor(id: string, data: any) {
  return await prisma.proveedor.update({
    where: { id },
    data
  })
}

export async function toggleProveedorActivo(id: string) {
  const p = await prisma.proveedor.findUnique({ where: { id } })
  if (!p) throw new Error('Proveedor no encontrado')
  return await prisma.proveedor.update({
    where: { id },
    data: { activo: !p.activo }
  })
}

export async function getProveedorMovimientos(proveedorId: string) {
  return await prisma.proveedorMovimiento.findMany({
    where: { proveedorId },
    orderBy: { fecha: 'desc' },
    include: {
      compra: true,
      pago: true
    }
  })
}

export async function registrarPagoProveedor(proveedorId: string, data: { importe: number; medioPago: string; referencia?: string; observaciones?: string; fecha?: Date }) {
  return await prisma.$transaction(async (tx) => {
    let compraRelacionadaId: string | undefined = undefined

    // 1. Validar la referencia si fue provista
    if (data.referencia && data.referencia.trim() !== '') {
      const compra = await tx.compra.findFirst({
        where: {
          proveedorId: proveedorId,
          numero: data.referencia.trim(),
          estado: { not: 'anulada' }
        }
      })

      if (!compra) {
        throw new Error(`No existe ninguna compra registrada con el comprobante/referencia "${data.referencia}" para este proveedor.`)
      }

      compraRelacionadaId = compra.id

      // Opcional: Actualizar el saldo pendiente de esa compra en particular
      const nuevoImportePagado = compra.importePagado + data.importe
      const nuevoSaldoPendiente = Math.max(0, compra.total - nuevoImportePagado)
      let nuevoEstado = compra.estado
      if (nuevoSaldoPendiente === 0) nuevoEstado = 'pagada'
      else if (nuevoImportePagado > 0) nuevoEstado = 'parcial'

      await tx.compra.update({
        where: { id: compra.id },
        data: {
          importePagado: nuevoImportePagado,
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado
        }
      })
    }

    // 1. Crear el pago
    const pago = await tx.pagoProveedor.create({
      data: {
        proveedorId,
        importe: data.importe,
        medioPago: data.medioPago,
        referencia: data.referencia,
        observaciones: data.observaciones,
        fecha: data.fecha || new Date()
      }
    })

    // 2. Obtener saldo actual
    const ultimoMovimiento = await tx.proveedorMovimiento.findFirst({
      where: { proveedorId },
      orderBy: { fecha: 'desc' }
    })
    const saldoAnterior = ultimoMovimiento ? ultimoMovimiento.saldoResultante : 0
    const saldoNuevo = saldoAnterior - data.importe

    // 3. Crear movimiento
    await tx.proveedorMovimiento.create({
      data: {
        proveedorId,
        pagoId: pago.id,
        compraId: compraRelacionadaId,
        tipo: 'PAGO',
        descripcion: `Pago: ${data.medioPago} ${data.referencia ? '(' + data.referencia + ')' : ''}`,
        monto: -data.importe,
        saldoResultante: saldoNuevo,
        fecha: pago.fecha
      }
    })

    return pago
  })
}

export async function registrarCompra(proveedorId: string, data: {
  fecha: Date
  numero?: string
  observaciones?: string
  detalles: Array<{
    productoId: string
    cantidad: number
    costoUnitario: number
  }>
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Calculate totals
    const total = data.detalles.reduce((acc, curr) => acc + (curr.cantidad * curr.costoUnitario), 0)

    // 1.5 Fetch provider to get diasVencimiento
    const proveedor = await tx.proveedor.findUnique({ where: { id: proveedorId } })
    let fechaVencimiento: Date | undefined = undefined
    if (proveedor && proveedor.diasVencimiento && proveedor.diasVencimiento > 0) {
      fechaVencimiento = new Date(data.fecha)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + proveedor.diasVencimiento)
    }

    // 2. Create the Compra and DetalleCompra
    const compra = await tx.compra.create({
      data: {
        proveedorId,
        fecha: data.fecha,
        numero: data.numero,
        observaciones: data.observaciones,
        total,
        saldoPendiente: total,
        fechaVencimiento,
        estado: 'recibida', // Default to recibida as per instructions for simplicity, could be derived from UI
        detalles: {
          create: data.detalles.map(d => ({
            productoId: d.productoId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            subtotal: d.cantidad * d.costoUnitario
          }))
        }
      },
      include: { detalles: true }
    })

    // 3. Update Provider Movimiento (Account current)
    const ultimoMovimiento = await tx.proveedorMovimiento.findFirst({
      where: { proveedorId },
      orderBy: { fecha: 'desc' }
    })
    const saldoAnterior = ultimoMovimiento ? ultimoMovimiento.saldoResultante : 0
    const saldoNuevo = saldoAnterior + total

    await tx.proveedorMovimiento.create({
      data: {
        proveedorId,
        compraId: compra.id,
        tipo: 'COMPRA',
        descripcion: `Compra ${data.numero ? '#' + data.numero : 'S/R'}`,
        monto: total, // debt increases
        saldoResultante: saldoNuevo,
        fecha: compra.fecha
      }
    })

    // 4. Update product stock and cost
    for (const d of data.detalles) {
      const producto = await tx.producto.findUnique({ where: { id: d.productoId } })
      if (producto) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: {
            stock: producto.stock + d.cantidad,
            costo: d.costoUnitario // update last known cost
          }
        })

        // Also update/create ProductoProveedor relationship for tracking last purchase cost
        await tx.productoProveedor.upsert({
          where: {
            proveedorId_productoId: {
              proveedorId,
              productoId: d.productoId
            }
          },
          update: {
            ultimoCosto: d.costoUnitario,
            fechaUltimaCompra: compra.fecha
          },
          create: {
            proveedorId,
            productoId: d.productoId,
            ultimoCosto: d.costoUnitario,
            fechaUltimaCompra: compra.fecha,
            esPrincipal: false
          }
        })
      }
    }

    return compra
  })
}

export async function getComprasByProveedor(proveedorId: string) {
  return await prisma.compra.findMany({
    where: { proveedorId },
    orderBy: { fecha: 'desc' },
    include: {
      detalles: {
        include: {
          producto: true
        }
      }
    }
  })
}

export async function anularCompra(compraId: string) {
  return await prisma.$transaction(async (tx) => {
    const compra = await tx.compra.findUnique({
      where: { id: compraId },
      include: { detalles: true }
    })

    if (!compra) throw new Error('Compra no encontrada')
    if (compra.estado === 'anulada') throw new Error('La compra ya está anulada')
    
    // Regla de negocio crítica: No anular compras que ya movieron caja (tienen pagos).
    if (compra.importePagado > 0) {
      throw new Error('No se puede anular una compra con pagos registrados. Para anularla, primero debés anular o desvincular los pagos asociados.')
    }

    // 1. Mark as anulada
    await tx.compra.update({
      where: { id: compraId },
      data: { estado: 'anulada', saldoPendiente: 0 }
    })

    // 2. Revert account current
    const ultimoMovimiento = await tx.proveedorMovimiento.findFirst({
      where: { proveedorId: compra.proveedorId },
      orderBy: { fecha: 'desc' }
    })
    const saldoAnterior = ultimoMovimiento ? ultimoMovimiento.saldoResultante : 0
    const saldoNuevo = saldoAnterior - compra.total // Reduce debt by the purchase amount

    await tx.proveedorMovimiento.create({
      data: {
        proveedorId: compra.proveedorId,
        compraId: compra.id,
        tipo: 'AJUSTE',
        descripcion: `Anulación Compra ${compra.numero ? '#' + compra.numero : 'S/R'}`,
        monto: -compra.total,
        saldoResultante: saldoNuevo,
        fecha: new Date()
      }
    })

    // 3. Revert stock
    for (const d of compra.detalles) {
      const producto = await tx.producto.findUnique({ where: { id: d.productoId } })
      if (producto) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: {
            stock: producto.stock - d.cantidad // It can go negative, that's fine for now or needs validation
          }
        })
      }
    }

    return true
  })
}


