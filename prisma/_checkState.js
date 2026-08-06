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
  // The previous script already dropped Producto and created new_Producto but failed to rename.
  // Let's check current state and fix.
  
  try {
    const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    console.log('Tablas actuales:', tables.map(t => t.name))
  } catch (e) {
    console.log('Error listando tablas:', e.message)
  }
  
  // The issue: Producto was dropped but new_Producto CREATE TABLE failed because the 
  // statement was split incorrectly. Let's recreate from backup.
  console.log('\nRecuperando desde backup...')
}

main()
  .catch(e => { console.error('ERROR:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
