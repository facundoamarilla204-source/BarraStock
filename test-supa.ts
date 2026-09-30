import { PrismaClient } from '@prisma/client'
import { verificarRenovacionSilenciosa, verificarEstadoLocal } from './src/main/services/licenciaService'

const prisma = new PrismaClient()

async function testSupabase() {
  console.log('--- Preparando Escenario 5 (Renovación Silenciosa Real) ---')
  
  // Set license to expired 3 days ago, with email test@barrastock.com
  // Assuming a valid test license code for the edge function. If BS-TEST-001 doesn't work, we'll see.
  // Actually, the edge function will look up by email or code.
  await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: {
      licenciaEmail: 'test@barrastock.com',
      licenciaCodigo: 'BS-TEST-001',
      licenciaVence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
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

  console.log('Estado inicial:')
  console.log(await verificarEstadoLocal())

  console.log('\nLlamando a verificarRenovacionSilenciosa()...')
  try {
    await verificarRenovacionSilenciosa()
    console.log('Llamada completada sin errores (el catch interno suprime errores).')
  } catch (error) {
    console.error('Error no capturado:', error)
  }

  console.log('\nEstado después del chequeo silencioso:')
  console.log(await verificarEstadoLocal())

  const config = await prisma.configuracion.findUnique({ where: { id: 'config' }})
  console.log('\nConfiguración en DB:')
  console.log(`Vence: ${config?.licenciaVence}`)
  console.log(`Último check: ${config?.licenciaUltimoCheck}`)

  await prisma.$disconnect()
}

testSupabase().catch(console.error)
