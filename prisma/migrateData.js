/**
 * Script de migración de datos: Ingrediente → Producto
 * 
 * EJECUTAR ANTES de prisma migrate dev.
 * 
 * Este script:
 * 1. Agrega columnas nuevas a Producto (unidadMedida, tamañoEnvase, vendiblePorUnidad) via SQL directo
 * 2. Migra datos de cada Ingrediente:
 *    - Si hay un Producto con el mismo nombre → fusiona datos y reasigna RecetaItems
 *    - Si no hay match → crea un Producto nuevo
 * 3. Reasigna RecetaItem.ingredienteId → productoId
 * 4. Logea todo lo que hace
 */

const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, 'dev.db')}`
    }
  }
})

async function main() {
  console.log('='.repeat(60))
  console.log('MIGRACIÓN DE DATOS: Ingrediente → Producto')
  console.log('='.repeat(60))
  console.log('')

  // Paso 1: Agregar columnas nuevas a Producto (si no existen)
  console.log('--- Paso 1: Agregando columnas nuevas a Producto ---')
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN unidadMedida TEXT NOT NULL DEFAULT 'unidad'`)
    console.log('  ✅ Columna unidadMedida agregada')
  } catch (e) {
    console.log('  ⚠️ Columna unidadMedida ya existe (ok)')
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN "tamañoEnvase" REAL`)
    console.log('  ✅ Columna tamañoEnvase agregada')
  } catch (e) {
    console.log('  ⚠️ Columna tamañoEnvase ya existe (ok)')
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN vendiblePorUnidad INTEGER NOT NULL DEFAULT 1`)
    console.log('  ✅ Columna vendiblePorUnidad agregada')
  } catch (e) {
    console.log('  ⚠️ Columna vendiblePorUnidad ya existe (ok)')
  }

  console.log('')

  // Paso 2: Leer todos los ingredientes
  console.log('--- Paso 2: Leyendo ingredientes existentes ---')
  const ingredientes = await prisma.$queryRawUnsafe('SELECT * FROM Ingrediente WHERE activo = 1')
  console.log(`  Encontrados: ${ingredientes.length} ingredientes activos`)
  console.log('')

  if (ingredientes.length === 0) {
    console.log('  No hay ingredientes para migrar. Finalizando.')
    return
  }

  // Leer productos existentes
  const productos = await prisma.$queryRawUnsafe('SELECT * FROM Producto')
  console.log(`  Productos existentes: ${productos.length}`)
  console.log('')

  // Paso 3: Migrar cada ingrediente
  console.log('--- Paso 3: Migrando ingredientes ---')
  
  const fusionados = []
  const creados = []
  const ambiguos = []

  for (const ing of ingredientes) {
    const nombreNorm = ing.nombre.trim().toLowerCase()
    
    // Buscar match exacto
    const match = productos.find(p => p.nombre.trim().toLowerCase() === nombreNorm)
    
    // Buscar posibles matches parciales (para alertar)
    const parciales = productos.filter(p => {
      const pNorm = p.nombre.trim().toLowerCase()
      return pNorm !== nombreNorm && (pNorm.includes(nombreNorm) || nombreNorm.includes(pNorm))
    })

    if (parciales.length > 0) {
      ambiguos.push({
        ingrediente: ing.nombre,
        posiblesMatches: parciales.map(p => p.nombre)
      })
    }

    if (match) {
      // FUSIONAR: actualizar Producto existente con datos del ingrediente
      console.log(`  🔗 FUSIONAR: Ingrediente "${ing.nombre}" → Producto "${match.nombre}" (id: ${match.id})`)
      
      await prisma.$executeRawUnsafe(
        `UPDATE Producto SET unidadMedida = ?, "tamañoEnvase" = ?, stock = ? WHERE id = ?`,
        ing.unidad,
        ing.unidad !== 'unidad' ? ing.stock : null,
        ing.stock,
        match.id
      )

      // Reasignar RecetaItems que apuntaban al ingrediente
      const recetaItems = await prisma.$queryRawUnsafe(
        'SELECT * FROM RecetaItem WHERE ingredienteId = ?', ing.id
      )
      
      if (recetaItems.length > 0) {
        await prisma.$executeRawUnsafe(
          'UPDATE RecetaItem SET productoId = ?, ingredienteId = NULL WHERE ingredienteId = ?',
          match.id, ing.id
        )
        console.log(`    → ${recetaItems.length} RecetaItem(s) reasignados a productoId: ${match.id}`)
      }

      fusionados.push({ ingrediente: ing.nombre, producto: match.nombre, productoId: match.id })
    } else {
      // CREAR: nuevo Producto a partir del ingrediente
      const newId = generateCuid()
      const now = new Date().toISOString()
      
      console.log(`  ➕ CREAR: Ingrediente "${ing.nombre}" → Nuevo Producto (id: ${newId})`)
      
      await prisma.$executeRawUnsafe(
        `INSERT INTO Producto (id, nombre, stock, precio, costo, categoria, activo, createdAt, updatedAt, unidadMedida, "tamañoEnvase", vendiblePorUnidad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId,
        ing.nombre,
        ing.stock,
        0, // precio = 0, ajustar manualmente
        ing.costo || 0,
        ing.categoria,
        1, // activo
        now,
        now,
        ing.unidad,
        null, // tamañoEnvase: no lo sabemos
        0 // vendiblePorUnidad = false
      )

      // Reasignar RecetaItems
      const recetaItems = await prisma.$queryRawUnsafe(
        'SELECT * FROM RecetaItem WHERE ingredienteId = ?', ing.id
      )
      
      if (recetaItems.length > 0) {
        await prisma.$executeRawUnsafe(
          'UPDATE RecetaItem SET productoId = ?, ingredienteId = NULL WHERE ingredienteId = ?',
          newId, ing.id
        )
        console.log(`    → ${recetaItems.length} RecetaItem(s) reasignados a productoId: ${newId}`)
      }

      creados.push({ ingrediente: ing.nombre, productoId: newId })
    }
  }

  // Paso 4: Resumen
  console.log('')
  console.log('='.repeat(60))
  console.log('RESUMEN DE MIGRACIÓN')
  console.log('='.repeat(60))
  console.log(`  Fusionados (ingrediente + producto existente): ${fusionados.length}`)
  for (const f of fusionados) {
    console.log(`    • "${f.ingrediente}" → "${f.producto}"`)
  }
  console.log(`  Creados como producto nuevo: ${creados.length}`)
  for (const c of creados) {
    console.log(`    • "${c.ingrediente}" (id: ${c.productoId})`)
  }
  
  if (ambiguos.length > 0) {
    console.log('')
    console.log('⚠️  CASOS AMBIGUOS (nombres parecidos pero NO iguales):')
    for (const a of ambiguos) {
      console.log(`    • Ingrediente "${a.ingrediente}" se parece a: ${a.posiblesMatches.join(', ')}`)
    }
    console.log('    → Estos NO se fusionaron automáticamente. Revisar manualmente.')
  }

  // Verificar que no quedaron RecetaItems huérfanos
  const huerfanos = await prisma.$queryRawUnsafe(
    'SELECT * FROM RecetaItem WHERE ingredienteId IS NOT NULL AND productoId IS NULL'
  )
  if (huerfanos.length > 0) {
    console.log('')
    console.log('❌ ALERTA: Hay RecetaItems huérfanos (ingredienteId sin productoId):')
    for (const h of huerfanos) {
      console.log(`    • RecetaItem id: ${h.id}, ingredienteId: ${h.ingredienteId}`)
    }
  } else {
    console.log('')
    console.log('✅ Todos los RecetaItems tienen productoId asignado. Migración exitosa.')
  }

  console.log('')
  console.log('Migración completada. Ahora puede ejecutar:')
  console.log('  1. Actualizar schema.prisma')
  console.log('  2. npx prisma migrate dev --name unify-producto-ingrediente')
}

// Simple CUID generator
function generateCuid() {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 12)
  return `c${timestamp}${randomPart}`
}

main()
  .catch((e) => {
    console.error('ERROR en migración:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
