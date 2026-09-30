const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.join(__dirname, 'dev.db')}` }
  }
})

async function check() {
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' }})
  console.log('Estado actual en BD:')
  console.log(JSON.stringify(config, null, 2))
  await prisma.$disconnect()
}

check().catch(console.error)
