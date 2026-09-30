const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.join(__dirname, 'dev.db')}` }
  }
})

async function setup() {
  console.log('--- Configurando BD para probar Renovación Silenciosa contra Supabase real ---')
  await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: {
      licenciaEmail: 'test@barrastock.com',
      licenciaCodigo: 'BS-TEST-001',
      licenciaVence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Venció hace 3 días
      licenciaEstado: 'gracia',
      licenciaUltimoCheck: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    },
    create: {
      id: 'config',
      licenciaEmail: 'test@barrastock.com',
      licenciaCodigo: 'BS-TEST-001',
      licenciaVence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      licenciaEstado: 'gracia',
      licenciaUltimoCheck: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  })
  console.log('BD lista. Ejecuta `npm run dev` y revisa la base de datos después.')
  await prisma.$disconnect()
}

setup().catch(console.error)
