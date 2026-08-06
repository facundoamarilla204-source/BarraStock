import { describe, it, expect, beforeEach } from 'vitest'
import { procesarVenta, anularVenta } from '../main/services/ventaService'
import { createProducto } from '../main/services/productoService'
import { createIngrediente } from '../main/services/ingredienteService'
import { createReceta } from '../main/services/recetaService'
import { prisma } from '../main/services/db'

describe('Motor de Ventas y Stock (Fase 3)', () => {
  let p1: any
  let p2: any
  let ing1: any
  let r1: any
  let r2: any

  beforeEach(async () => {
    // Seed básico para los tests
    p1 = await createProducto({ nombre: 'Cerveza', precio: 500, stock: 10 })
    p2 = await createProducto({ nombre: 'Agua', precio: 300, stock: 5 })
    
    ing1 = await createIngrediente({ nombre: 'Fernet', unidad: 'ml', stock: 1000 })
    
    r1 = await createReceta({
      nombre: 'Fernet 70/30',
      categoria: 'trago',
      precio: 1500,
      items: [
        { ingredienteId: ing1.id, cantidad: 50, unidad: 'ml' }
      ]
    })
    
    // Combo que usa un producto en lugar de ingrediente
    r2 = await createReceta({
      nombre: 'Promo Cerveza x2',
      categoria: 'combo',
      precio: 900,
      items: [
        { productoId: p1.id, cantidad: 2, unidad: 'unidad' }
      ]
    })
  })

  it('debe procesar una venta simple de un producto y descontar stock', async () => {
    const venta = await procesarVenta([{ tipo: 'producto', id: p1.id, cantidad: 2 }])
    
    expect(venta).toBeDefined()
    expect(venta.total).toBe(1000)
    expect(venta.estado).toBe('activa')

    const productoDB = await prisma.producto.findUnique({ where: { id: p1.id } })
    expect(productoDB?.stock).toBe(8) // 10 - 2
  })

  it('debe procesar una venta de receta y descontar el stock de ingredientes', async () => {
    const venta = await procesarVenta([{ tipo: 'receta', id: r1.id, cantidad: 1 }])
    
    expect(venta.total).toBe(1500)

    const ingredienteDB = await prisma.ingrediente.findUnique({ where: { id: ing1.id } })
    expect(ingredienteDB?.stock).toBe(950) // 1000 - 50
  })

  it('debe procesar una venta mixta', async () => {
    const venta = await procesarVenta([
      { tipo: 'producto', id: p2.id, cantidad: 1 }, // Agua 300
      { tipo: 'receta', id: r1.id, cantidad: 2 }    // 2 x Fernet (1500) = 3000
    ])

    expect(venta.total).toBe(3300)

    const productoDB = await prisma.producto.findUnique({ where: { id: p2.id } })
    expect(productoDB?.stock).toBe(4) // 5 - 1

    const ingredienteDB = await prisma.ingrediente.findUnique({ where: { id: ing1.id } })
    expect(ingredienteDB?.stock).toBe(900) // 1000 - 100
  })

  it('debe fallar la venta si no hay stock suficiente de un producto (atomicidad)', async () => {
    // Intentamos comprar 10 Aguas (hay 5) y 1 Cerveza
    // La transacción debería fallar y el stock de la cerveza no debe descontarse
    await expect(
      procesarVenta([
        { tipo: 'producto', id: p1.id, cantidad: 1 },
        { tipo: 'producto', id: p2.id, cantidad: 10 }
      ])
    ).rejects.toThrow(/Stock insuficiente/)

    const cervezaDB = await prisma.producto.findUnique({ where: { id: p1.id } })
    expect(cervezaDB?.stock).toBe(10) // No se descontó
  })

  it('debe fallar la venta si no hay stock suficiente para una receta', async () => {
    // 21 tragos x 50ml = 1050ml (hay 1000ml)
    await expect(
      procesarVenta([{ tipo: 'receta', id: r1.id, cantidad: 21 }])
    ).rejects.toThrow(/Stock insuficiente/)

    const ingredienteDB = await prisma.ingrediente.findUnique({ where: { id: ing1.id } })
    expect(ingredienteDB?.stock).toBe(1000)
  })

  it('debe reponer el stock correctamente al anular una venta (productos e ingredientes)', async () => {
    const venta = await procesarVenta([
      { tipo: 'producto', id: p1.id, cantidad: 1 },
      { tipo: 'receta', id: r1.id, cantidad: 2 }
    ])

    // Verificar stock descontado
    let cervezaDB = await prisma.producto.findUnique({ where: { id: p1.id } })
    let fernetDB = await prisma.ingrediente.findUnique({ where: { id: ing1.id } })
    expect(cervezaDB?.stock).toBe(9)
    expect(fernetDB?.stock).toBe(900)

    // Anulamos
    const ventaAnulada = await anularVenta(venta.id, 'Prueba unitaria')
    expect(ventaAnulada.estado).toBe('anulada')

    // Verificar stock repuesto
    cervezaDB = await prisma.producto.findUnique({ where: { id: p1.id } })
    fernetDB = await prisma.ingrediente.findUnique({ where: { id: ing1.id } })
    expect(cervezaDB?.stock).toBe(10)
    expect(fernetDB?.stock).toBe(1000)
  })
})
