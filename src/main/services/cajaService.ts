import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const cajaService = {
  /**
   * Obtiene la caja que actualmente está abierta (si existe).
   * Además, calcula los totales en vivo en base a las ventas asociadas.
   */
  async getCajaAbierta() {
    const caja = await prisma.cajaSesion.findFirst({
      where: { estado: 'abierta' },
      include: {
        ventas: true
      }
    })

    if (!caja) return null

    // Calcular totales en vivo
    let totalEfectivo = 0
    let totalTransferencia = 0
    let cantidadVentas = 0
    let cantidadAnuladas = 0

    caja.ventas.forEach(venta => {
      if (venta.estado === 'activa') {
        cantidadVentas++
        if (venta.medioPago.toLowerCase() === 'efectivo') {
          totalEfectivo += venta.total
        } else {
          totalTransferencia += venta.total
        }
      } else if (venta.estado === 'anulada') {
        cantidadAnuladas++
      }
    })

    const totalVentas = totalEfectivo + totalTransferencia
    const totalEsperadoCaja = caja.fondoInicial + totalEfectivo

    return {
      ...caja,
      totalEfectivo,
      totalTransferencia,
      totalVentas,
      totalEsperadoCaja,
      cantidadVentas,
      cantidadAnuladas
    }
  },

  /**
   * Abre una nueva sesión de caja. Falla si ya hay una abierta.
   */
  async abrirCaja(fondoInicial: number) {
    const abierta = await prisma.cajaSesion.findFirst({
      where: { estado: 'abierta' }
    })
    
    if (abierta) {
      throw new Error('Ya existe una caja abierta')
    }

    // Calcular el siguiente número de caja
    const ultima = await prisma.cajaSesion.findFirst({
      orderBy: { numero: 'desc' }
    })
    const numero = ultima ? ultima.numero + 1 : 1

    return await prisma.cajaSesion.create({
      data: {
        numero,
        fondoInicial,
        estado: 'abierta'
      }
    })
  },

  /**
   * Cierra la caja actual, guardando los totales definitivos.
   */
  async cerrarCaja() {
    const cajaActual = await this.getCajaAbierta()
    
    if (!cajaActual) {
      throw new Error('No hay caja abierta para cerrar')
    }

    return await prisma.cajaSesion.update({
      where: { id: cajaActual.id },
      data: {
        estado: 'cerrada',
        fechaCierre: new Date(),
        totalEfectivo: cajaActual.totalEfectivo,
        totalTransferencia: cajaActual.totalTransferencia,
        totalVentas: cajaActual.totalVentas,
        totalEsperadoCaja: cajaActual.totalEsperadoCaja,
        cantidadVentas: cajaActual.cantidadVentas,
        cantidadAnuladas: cajaActual.cantidadAnuladas
      }
    })
  },

  /**
   * Obtiene el historial de cajas (solo las cerradas) ordenadas de más reciente a más antigua.
   */
  async getHistorialCajas() {
    return await prisma.cajaSesion.findMany({
      where: { estado: 'cerrada' },
      orderBy: { fechaCierre: 'desc' }
    })
  },

  /**
   * Obtiene la última caja que fue cerrada, si existe.
   */
  async getUltimaCajaCerrada() {
    return await prisma.cajaSesion.findFirst({
      where: { estado: 'cerrada' },
      orderBy: { fechaCierre: 'desc' }
    })
  },

  /**
   * Obtiene una caja específica con todas sus ventas y detalles.
   */
  async getCajaConVentas(cajaId: string) {
    return await prisma.cajaSesion.findUnique({
      where: { id: cajaId },
      include: {
        ventas: {
          include: {
            detalles: {
              include: {
                producto: true,
                receta: true
              }
            }
          },
          orderBy: { fecha: 'asc' }
        }
      }
    })
  },

  /**
   * Reabre la última caja cerrada. Solo es posible si no hay una caja actualmente abierta.
   */
  async reabrirCaja(cajaId: string) {
    const cajaAbierta = await this.getCajaAbierta()
    if (cajaAbierta) {
      throw new Error('No se puede reabrir una caja porque ya hay una abierta actualmente.')
    }

    const ultimaCerrada = await this.getUltimaCajaCerrada()
    if (!ultimaCerrada || ultimaCerrada.id !== cajaId) {
      throw new Error('Solo se puede reabrir la caja más reciente que fue cerrada.')
    }

    // Reabrir caja (anulando los campos de cierre)
    return await prisma.cajaSesion.update({
      where: { id: cajaId },
      data: {
        estado: 'abierta',
        fechaCierre: null,
        totalEfectivo: null,
        totalTransferencia: null,
        totalVentas: null,
        totalEsperadoCaja: null,
        cantidadVentas: null,
        cantidadAnuladas: null
      }
    })
  }
}
