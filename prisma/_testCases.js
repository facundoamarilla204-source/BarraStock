const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    }
  }
})

// Simulated functions from ventaService
function calcularDescuentoProductoCerrado(producto) {
  if (producto.tamanioEnvase && producto.unidadMedida !== 'unidad') {
    return producto.tamanioEnvase
  }
  return 1
}

async function procesarVenta(tx, carrito, medioPago = 'efectivo') {
  let totalVenta = 0
  const detallesData = []

  for (const item of carrito) {
    if (item.tipo === 'producto') {
      const producto = await tx.producto.findUnique({ where: { id: item.id } })
      const descuentoTotal = calcularDescuentoProductoCerrado(producto) * item.cantidad
      await tx.producto.update({
        where: { id: producto.id },
        data: { stock: { decrement: descuentoTotal } }
      })
      const subtotal = producto.precio * item.cantidad
      totalVenta += subtotal
      detallesData.push({
        tipo: 'producto',
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: producto.precio,
        subtotal
      })
    } else if (item.tipo === 'receta') {
      const receta = await tx.receta.findUnique({
        where: { id: item.id },
        include: { items: { include: { producto: true } } }
      })
      for (const subItem of receta.items) {
        const cantidadNecesaria = subItem.cantidad * item.cantidad
        await tx.producto.update({
          where: { id: subItem.producto.id },
          data: { stock: { decrement: cantidadNecesaria } }
        })
      }
      const subtotal = receta.precio * item.cantidad
      totalVenta += subtotal
      detallesData.push({
        tipo: 'receta',
        recetaId: receta.id,
        cantidad: item.cantidad,
        precioUnitario: receta.precio,
        subtotal
      })
    }
  }

  return await tx.venta.create({
    data: {
      total: totalVenta,
      medioPago,
      estado: 'activa',
      detalles: { create: detallesData }
    },
    include: { detalles: true }
  })
}

async function anularVenta(tx, ventaId) {
  const venta = await tx.venta.findUnique({
    where: { id: ventaId },
    include: {
      detalles: {
        include: {
          producto: true,
          receta: { include: { items: { include: { producto: true } } } }
        }
      }
    }
  })

  for (const detalle of venta.detalles) {
    if (detalle.tipo === 'producto' && detalle.producto) {
      const incrementoTotal = calcularDescuentoProductoCerrado(detalle.producto) * detalle.cantidad
      await tx.producto.update({
        where: { id: detalle.productoId },
        data: { stock: { increment: incrementoTotal } }
      })
    } else if (detalle.tipo === 'receta' && detalle.receta) {
      for (const subItem of detalle.receta.items) {
        const cantidadAReponer = subItem.cantidad * detalle.cantidad
        await tx.producto.update({
          where: { id: subItem.productoId },
          data: { stock: { increment: cantidadAReponer } }
        })
      }
    }
  }

  return await tx.venta.update({
    where: { id: venta.id },
    data: { estado: 'anulada', anuladaEn: new Date(), motivoAnulacion: 'Test' }
  })
}

async function runTests() {
  console.log('--- INICIANDO VERIFICACIÓN ---')
  
  // Caso 1: Verificar stock Fernet Branca 1L
  const fernet = await prisma.producto.findFirst({ where: { nombre: { contains: 'Fernet Branca' } } })
  console.log(`\n[Caso 1] Fernet Branca stock: ${fernet.stock} ${fernet.unidadMedida}`)
  if (fernet.stock !== 14000 && fernet.stock !== 500) { // from migrate or seed
    console.log('  -> OJO: el stock no es 14000. Probablemente viene de la migración original de Ingrediente (stock 500).')
  } else {
    console.log('  -> OK')
  }

  const coca = await prisma.producto.findFirst({ where: { nombre: { contains: 'Coca Cola' } } })
  
  // Caso 2: Crear receta Fernet Cola
  console.log('\n[Caso 2] Creando receta Fernet Cola (30% fernet, 70% coca)...')
  const receta = await prisma.receta.create({
    data: {
      nombre: 'Fernet Cola Test',
      categoria: 'trago',
      precio: 5000,
      items: {
        create: [
          { productoId: fernet.id, cantidad: 300, unidad: 'ml' },
          { productoId: coca.id, cantidad: 1, unidad: 'unidad' }
        ]
      }
    }
  })
  console.log(`  -> Receta creada: ${receta.id}`)

  // Caso 3: Vender Fernet Cola
  console.log('\n[Caso 3] Vendiendo 1x Fernet Cola Test...')
  const stockFernetAntes = (await prisma.producto.findUnique({ where: { id: fernet.id } })).stock
  
  let ventaReceta = null
  await prisma.$transaction(async (tx) => {
    ventaReceta = await procesarVenta(tx, [{ tipo: 'receta', id: receta.id, cantidad: 1 }])
  })
  
  const stockFernetDespues = (await prisma.producto.findUnique({ where: { id: fernet.id } })).stock
  console.log(`  -> Stock Fernet Antes: ${stockFernetAntes}, Después: ${stockFernetDespues}`)
  if (stockFernetDespues === stockFernetAntes - 300) {
    console.log('  -> OK: Descontó 300ml de Fernet')
  } else {
    console.log('  -> ERROR: No descontó lo correcto')
  }

  // Caso 4: Vender Cerveza Quilmes 1L (botella cerrada)
  console.log('\n[Caso 4] Vendiendo 1x Cerveza Quilmes 1L (botella cerrada)...')
  const cerveza = await prisma.producto.findFirst({ where: { nombre: { contains: 'Cerveza Quilmes' } } })
  const stockCervezaAntes = cerveza.stock
  
  let ventaCerveza = null
  await prisma.$transaction(async (tx) => {
    ventaCerveza = await procesarVenta(tx, [{ tipo: 'producto', id: cerveza.id, cantidad: 1 }])
  })
  
  const stockCervezaDespues = (await prisma.producto.findUnique({ where: { id: cerveza.id } })).stock
  console.log(`  -> Stock Cerveza Antes: ${stockCervezaAntes}, Después: ${stockCervezaDespues}`)
  if (stockCervezaDespues === stockCervezaAntes - 1) { // as it's unidad
    console.log('  -> OK: Descontó 1 unidad de Cerveza')
  } else {
    console.log('  -> ERROR: No descontó 1 unidad')
  }

  // Caso 5: Anular venta de receta
  console.log('\n[Caso 5] Anulando venta de Fernet Cola Test...')
  await prisma.$transaction(async (tx) => {
    await anularVenta(tx, ventaReceta.id)
  })
  const stockFernetFinal = (await prisma.producto.findUnique({ where: { id: fernet.id } })).stock
  console.log(`  -> Stock Fernet devuelto a: ${stockFernetFinal}`)
  if (stockFernetFinal === stockFernetAntes) {
    console.log('  -> OK: Stock devuelto correctamente')
  } else {
    console.log('  -> ERROR: Stock no se devolvió')
  }
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
