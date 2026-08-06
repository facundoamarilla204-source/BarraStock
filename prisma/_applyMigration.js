const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    }
  }
})

async function exec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`  ✅ ${label}`)
  } catch (e) {
    console.log(`  ⚠️ ${label}: ${e.message.substring(0, 100)}`)
    throw e
  }
}

async function main() {
  console.log('Aplicando migración SQL...\n')

  // 1. Drop Ingrediente index and table
  await exec(`DROP INDEX IF EXISTS "Ingrediente_nombre_idx"`, 'Drop Ingrediente index')
  await exec(`PRAGMA foreign_keys=off`, 'FK off')
  await exec(`DROP TABLE IF EXISTS "Ingrediente"`, 'Drop Ingrediente table')
  await exec(`PRAGMA foreign_keys=on`, 'FK on')

  // 2. Recreate RecetaItem without ingredienteId
  await exec(`PRAGMA defer_foreign_keys=ON`, 'Defer FK on')
  await exec(`PRAGMA foreign_keys=OFF`, 'FK off')

  await exec(`CREATE TABLE "new_RecetaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "unidad" TEXT NOT NULL,
    CONSTRAINT "RecetaItem_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecetaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`, 'Create new_RecetaItem')

  await exec(`INSERT INTO "new_RecetaItem" ("cantidad", "id", "productoId", "recetaId", "unidad") SELECT "cantidad", "id", "productoId", "recetaId", "unidad" FROM "RecetaItem"`, 'Copy RecetaItem data')
  await exec(`DROP TABLE "RecetaItem"`, 'Drop old RecetaItem')
  await exec(`ALTER TABLE "new_RecetaItem" RENAME TO "RecetaItem"`, 'Rename new_RecetaItem')
  await exec(`CREATE INDEX "RecetaItem_recetaId_idx" ON "RecetaItem"("recetaId")`, 'Index recetaId')
  await exec(`CREATE INDEX "RecetaItem_productoId_idx" ON "RecetaItem"("productoId")`, 'Index productoId')

  // 3. Recreate Producto with proper column definitions (preserving migrated data)
  await exec(`CREATE TABLE "new_Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "precio" REAL NOT NULL DEFAULT 0,
    "costo" REAL NOT NULL DEFAULT 0,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "unidadMedida" TEXT NOT NULL DEFAULT 'unidad',
    "tamanioEnvase" REAL,
    "vendiblePorUnidad" BOOLEAN NOT NULL DEFAULT true
  )`, 'Create new_Producto')

  await exec(`INSERT INTO "new_Producto" ("id", "nombre", "stock", "precio", "costo", "categoria", "activo", "createdAt", "updatedAt", "unidadMedida", "tamanioEnvase", "vendiblePorUnidad") SELECT "id", "nombre", "stock", "precio", "costo", "categoria", "activo", "createdAt", "updatedAt", "unidadMedida", "tamanioEnvase", "vendiblePorUnidad" FROM "Producto"`, 'Copy Producto data (all columns)')
  await exec(`DROP TABLE "Producto"`, 'Drop old Producto')
  await exec(`ALTER TABLE "new_Producto" RENAME TO "Producto"`, 'Rename new_Producto')
  await exec(`CREATE INDEX "Producto_nombre_idx" ON "Producto"("nombre")`, 'Index nombre')

  await exec(`PRAGMA foreign_keys=ON`, 'FK on')
  await exec(`PRAGMA defer_foreign_keys=OFF`, 'Defer FK off')

  console.log('\n--- Verificación ---')
  
  const productos = await prisma.$queryRawUnsafe('SELECT id, nombre, unidadMedida, tamanioEnvase, vendiblePorUnidad, stock FROM Producto ORDER BY nombre')
  console.log(`\n${productos.length} productos en la BD:`)
  for (const p of productos) {
    console.log(`  ${p.nombre} | unidad: ${p.unidadMedida} | envase: ${p.tamanioEnvase} | vendible: ${p.vendiblePorUnidad} | stock: ${p.stock}`)
  }

  try {
    await prisma.$queryRawUnsafe('SELECT count(*) FROM Ingrediente')
    console.log('\n❌ Tabla Ingrediente todavía existe!')
  } catch (e) {
    console.log('\n✅ Tabla Ingrediente eliminada')
  }

  const items = await prisma.$queryRawUnsafe('SELECT ri.id, ri.productoId, p.nombre FROM RecetaItem ri JOIN Producto p ON p.id = ri.productoId')
  console.log(`✅ ${items.length} RecetaItems verificados`)
  
  console.log('\n✅ Migración de schema completada exitosamente')
}

main()
  .catch(e => { console.error('\n❌ ERROR:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
