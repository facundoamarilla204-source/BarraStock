/**
 * test-licencia-escenarios.js
 * 
 * Configura la tabla Configuracion con datos de licencia simulados
 * para probar cada escenario de vencimiento.
 * 
 * Uso: node prisma/test-licencia-escenarios.js <numero_escenario>
 * 
 * Después de ejecutar, abrir la app con: npm run dev
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

const ESCENARIOS = {
  1: {
    nombre: 'Licencia activa, lejos de vencer (30 días)',
    licenciaVence: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa',
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  2: {
    nombre: 'Licencia por vencer pronto (5 días)',
    licenciaVence: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa',
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  3: {
    nombre: 'Vencida hace 2 días (dentro de gracia de 5)',
    licenciaVence: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa', // Se debería actualizar a 'gracia' al verificar
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  4: {
    nombre: 'Vencida hace 10 días (gracia agotada)',
    licenciaVence: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa', // Se debería actualizar a 'bloqueada' al verificar
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  5: {
    nombre: 'Vencida localmente (hace 3 días) — para probar renovación silenciosa',
    licenciaVence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa',
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  6: {
    nombre: 'Igual que Escenario 3 (probar sin internet)',
    licenciaVence: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa',
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    licenciaUltimoCheck: new Date()
  },
  7: {
    nombre: 'Licencia activa + ultimoCheck en el futuro (simula reloj atrasado)',
    licenciaVence: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    licenciaEstado: 'activa',
    licenciaEmail: 'test@barrastock.com',
    licenciaCodigo: 'BS-TEST-001',
    // Simulamos que el último check fue "en el futuro" (= el reloj retrocedió)
    licenciaUltimoCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}

async function main() {
  const num = parseInt(process.argv[2])

  if (!num || !ESCENARIOS[num]) {
    console.log('Uso: node prisma/test-licencia-escenarios.js <1-7>')
    console.log('')
    console.log('Escenarios disponibles:')
    for (const [k, v] of Object.entries(ESCENARIOS)) {
      console.log(`  ${k}: ${v.nombre}`)
    }
    process.exit(1)
  }

  const escenario = ESCENARIOS[num]
  console.log(`\n━━━ Escenario ${num}: ${escenario.nombre} ━━━\n`)

  const data = {
    licenciaVence: escenario.licenciaVence,
    licenciaEstado: escenario.licenciaEstado,
    licenciaEmail: escenario.licenciaEmail,
    licenciaCodigo: escenario.licenciaCodigo,
    licenciaUltimoCheck: escenario.licenciaUltimoCheck
  }

  await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: data,
    create: { id: 'config', ...data }
  })

  // Verificar que se guardó
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })

  console.log('Datos guardados en Configuracion:')
  console.log(`  licenciaEmail:       ${config.licenciaEmail}`)
  console.log(`  licenciaCodigo:      ${config.licenciaCodigo}`)
  console.log(`  licenciaVence:       ${config.licenciaVence?.toISOString()}`)
  console.log(`  licenciaEstado:      ${config.licenciaEstado}`)
  console.log(`  licenciaUltimoCheck: ${config.licenciaUltimoCheck?.toISOString()}`)
  console.log(`  Ahora:               ${new Date().toISOString()}`)

  const diffMs = Date.now() - new Date(config.licenciaVence).getTime()
  const diffDays = (diffMs / (1000 * 3600 * 24)).toFixed(1)
  if (diffMs > 0) {
    console.log(`\n  → Venció hace ${diffDays} días`)
  } else {
    console.log(`\n  → Vence en ${Math.abs(parseFloat(diffDays)).toFixed(1)} días`)
  }

  console.log(`\nAhora ejecutá: npm run dev\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
