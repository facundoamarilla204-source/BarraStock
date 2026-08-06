const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
    }
  }
})

async function main() {
  // SQLite doesn't support RENAME COLUMN in older versions.
  // We need to check if the column exists with the old name and handle it.
  // Since SQLite ALTER TABLE RENAME COLUMN requires SQLite 3.25.0+
  try {
    // Try renaming
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto RENAME COLUMN "tama\u00f1oEnvase" TO tamanioEnvase`)
    console.log('Columna renombrada exitosamente')
  } catch (e) {
    console.log('No se pudo renombrar (puede que ya tenga el nombre correcto):', e.message)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
