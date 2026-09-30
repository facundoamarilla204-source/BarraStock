const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

const GRACE_PERIOD_DAYS = 5;

async function verificarEstadoLocal() {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' }
  })

  if (!config) return 'bloqueada'
  if (!config.licenciaVence) return 'bloqueada'

  const ahora = new Date()
  const vence = new Date(config.licenciaVence)

  if (config.licenciaUltimoCheck) {
    const ultimoCheck = new Date(config.licenciaUltimoCheck)
    const CLOCK_TOLERANCE_MS = 5 * 60 * 1000 // 5 minutos

    if (ultimoCheck.getTime() > ahora.getTime() + CLOCK_TOLERANCE_MS) {
      console.warn('reloj manipulado')
      return 'gracia'
    }
  }

  const diffTime = ahora.getTime() - vence.getTime()
  const diffDays = diffTime / (1000 * 3600 * 24)

  let nuevoEstado = 'activa'

  if (diffDays > GRACE_PERIOD_DAYS) {
    nuevoEstado = 'bloqueada'
  } else if (diffDays > 0) {
    nuevoEstado = 'gracia'
  }
  
  return { nuevoEstado, diffDays, ahora, vence };
}

async function main() { 
  console.log(await verificarEstadoLocal()); 
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
