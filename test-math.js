const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' }
  })
  
  const ahora = new Date()
  const vence = new Date(config.licenciaVence)

  const diffTime = ahora.getTime() - vence.getTime()
  const diffDays = diffTime / (1000 * 3600 * 24)

  let nuevoEstado = 'activa'
  const GRACE_PERIOD_DAYS = 5

  if (diffDays > GRACE_PERIOD_DAYS) {
    nuevoEstado = 'bloqueada'
  } else if (diffDays > 0) {
    nuevoEstado = 'gracia'
  }
  
  console.log("diffDays:", diffDays)
  console.log("nuevoEstado:", nuevoEstado)
}

main().catch(console.error)
