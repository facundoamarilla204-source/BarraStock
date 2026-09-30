const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    const res = await prisma.$queryRawUnsafe(`PRAGMA table_info('_prisma_migrations')`)
    console.log(res)
  } catch(e) {
    console.log(e.message)
  }
}
test()
