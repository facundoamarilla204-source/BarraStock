import { beforeAll, afterAll, afterEach } from 'vitest'
import { execSync } from 'child_process'
import { prisma } from '../main/services/db'

// Cambiar la base de datos a test.db
process.env.DATABASE_URL = 'file:./test.db'

beforeAll(async () => {
  // Ejecutar migraciones en la base de datos de test
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
})

afterEach(async () => {
  // Limpiar la base de datos después de cada test
  const tableNames = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`

  for (const { name } of tableNames) {
    if (name !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`)
      } catch (error) {
        console.error(`Error limpiando la tabla ${name}:`, error)
      }
    }
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
