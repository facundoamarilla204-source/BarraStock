const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    }
  }
})

async function runTests() {
  console.log('--- TEST CATEGORIA AUTOCOMPLETADO (Simulación backend) ---')

  // Paso 1: Cargar un producto con categoría "Snacks" (nueva)
  const prod1 = await prisma.producto.create({
    data: {
      nombre: 'Papas Fritas Lays',
      precio: 1500,
      costo: 1000,
      categoria: 'Snacks',
      unidadMedida: 'unidad',
      vendiblePorUnidad: true,
      stock: 50
    }
  })
  console.log(`Producto 1 creado: ${prod1.nombre} -> Categoría: "${prod1.categoria}"`)

  // Paso 2: Cargar un segundo producto usando una variación ("snacks ")
  // Simularemos que el onBlur o el selector del frontend usó el valor normalizado existente "Snacks"
  // ya que sabemos que nuestro componente de React hace esto.
  
  // Vamos a simular la lógica del onBlur:
  const productos = await prisma.producto.findMany()
  const categoriasExistentes = Array.from(new Set(productos.map(p => p.categoria).filter(Boolean)))
  
  const userInput = "snacks "
  const normalizedValue = userInput.trim().toLowerCase()
  const exactMatch = categoriasExistentes.find(cat => cat.toLowerCase() === normalizedValue)

  let finalCategoriaToSave = userInput.trim()
  if (exactMatch && exactMatch !== userInput) {
    finalCategoriaToSave = exactMatch
  }

  const prod2 = await prisma.producto.create({
    data: {
      nombre: 'Maní Salado',
      precio: 800,
      costo: 500,
      categoria: finalCategoriaToSave,
      unidadMedida: 'unidad',
      vendiblePorUnidad: true,
      stock: 100
    }
  })
  console.log(`Producto 2 creado con input "${userInput}" -> Guardado con categoría: "${prod2.categoria}"`)

  // Paso 3: Confirmar en BD
  if (prod1.categoria === prod2.categoria) {
    console.log('EXITO: Las categorías son exactamente iguales.')
  } else {
    console.log('ERROR: Las categorías son distintas.')
  }
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
