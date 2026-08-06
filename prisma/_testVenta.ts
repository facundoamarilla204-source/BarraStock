const { PrismaClient } = require('@prisma/client')
const path = require('path')
const ventaService = require('../src/main/services/ventaService')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    }
  }
})

async function runTests() {
  console.log('--- TEST NRO VENTA Y ANULACION ---')

  // Paso 1: Crear un producto de prueba
  const prod1 = await prisma.producto.create({
    data: {
      nombre: 'Cerveza Test',
      precio: 1000,
      costo: 500,
      categoria: 'Bebidas',
      unidadMedida: 'unidad',
      vendiblePorUnidad: true,
      stock: 10
    }
  })
  console.log(`Producto creado. Stock inicial: ${prod1.stock}`)

  // Paso 2: Crear una venta
  const carrito = [
    { tipo: 'producto', id: prod1.id, cantidad: 2 }
  ]
  const venta = await ventaService.procesarVenta(carrito, 'efectivo')
  console.log(`Venta creada. ID interno: ${venta.id} | Nro Venta Legible: #${venta.numero}`)

  // Verificamos que stock bajo
  const prodPostVenta = await prisma.producto.findUnique({ where: { id: prod1.id }})
  console.log(`Stock post-venta (debería ser 8): ${prodPostVenta.stock}`)
  
  if (prodPostVenta.stock !== 8) throw new Error('Stock no descontó correctamente')

  // Paso 3: Anular la venta
  const ventaAnulada = await ventaService.anularVenta(venta.id, 'Prueba de anulación')
  console.log(`Venta anulada. Nuevo estado: ${ventaAnulada.estado}`)

  // Verificamos que stock repuso
  const prodPostAnulacion = await prisma.producto.findUnique({ where: { id: prod1.id }})
  console.log(`Stock post-anulación (debería ser 10): ${prodPostAnulacion.stock}`)

  if (prodPostAnulacion.stock !== 10) throw new Error('Stock no se repuso correctamente')

  // Verificar que intentar anular de nuevo lanza error
  try {
    await ventaService.anularVenta(venta.id, 'Segunda anulación')
    throw new Error('Debería haber fallado al anular dos veces')
  } catch (err) {
    console.log(`Anulación doble falló como se esperaba: ${err.message}`)
  }
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
