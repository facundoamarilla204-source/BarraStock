import { prisma } from './db'
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const GRACE_PERIOD_DAYS = 5

export async function activarLicencia(codigo: string, email: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Configuración de conexión no encontrada')
  }

  // 1. Llamar a Supabase Edge Function para verificar y activar el código
  const response = await fetch(`${SUPABASE_URL}/functions/v1/activar-licencia`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, codigo })
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error al conectar con el servidor de licencias')
  }

  // 2. Guardar en base local
  const config = await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: {
      licenciaCodigo: codigo,
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaEstado: 'activa',
      licenciaUltimoCheck: new Date()
    },
    create: {
      id: 'config',
      licenciaCodigo: codigo,
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaEstado: 'activa',
      licenciaUltimoCheck: new Date()
    }
  })

  return config
}

export async function verificarEstadoLocal() {
  const config = await prisma.configuracion.findUnique({
    where: { id: 'config' }
  })

  if (!config) return 'bloqueada'
  if (!config.licenciaVence) return 'bloqueada'

  const ahora = new Date()
  const vence = new Date(config.licenciaVence)

  // Calcular la diferencia en días
  const diffTime = ahora.getTime() - vence.getTime()
  const diffDays = diffTime / (1000 * 3600 * 24)

  let nuevoEstado = 'activa'

  if (diffDays > GRACE_PERIOD_DAYS) {
    nuevoEstado = 'bloqueada'
  } else if (diffDays > 0) {
    nuevoEstado = 'gracia'
  }

  if (config.licenciaEstado !== nuevoEstado) {
    await prisma.configuracion.update({
      where: { id: 'config' },
      data: { licenciaEstado: nuevoEstado }
    })
  }

  return nuevoEstado
}

export async function verificarRenovacionSilenciosa() {
  try {
    const config = await prisma.configuracion.findUnique({
      where: { id: 'config' }
    })

    if (!config || !config.licenciaCodigo) return

    if (!SUPABASE_URL || !SUPABASE_KEY) return

    // Buscar actualización de fecha de vencimiento vía Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chequear-licencia`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: config.licenciaEmail })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.fecha_vencimiento) {
        await prisma.configuracion.update({
          where: { id: 'config' },
          data: {
            licenciaVence: new Date(data.fecha_vencimiento),
            licenciaUltimoCheck: new Date()
          }
        })
        
        // Reevaluar estado local después de la actualización
        await verificarEstadoLocal()
      }
    }
  } catch (error) {
    console.log('Fallo el chequeo silencioso de licencia (posiblemente offline)', error)
  }
}

export async function solicitarRecuperacionLicencia(email: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Configuración de conexión no encontrada')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/solicitar-recuperacion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  })

  const data = await response.json()
  return data
}

export async function confirmarRecuperacionLicencia(email: string, codigo: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Configuración de conexión no encontrada')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/confirmar-recuperacion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, codigo })
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Código inválido o expirado')
  }

  // Si fue exitoso, guardamos igual que en la activación normal
  // PERO mantenemos el codigo de activación original en null o generamos uno ficticio? 
  // No, mantengamos el que ya tenemos si existe o vacío. La BD local requiere licenciaCodigo?
  // La tabla configuracion tiene licenciaCodigo opcional u obligatorio?
  
  // Obtenemos config actual por si tiene licenciaCodigo (por las dudas)
  const existingConfig = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  const codigoActivacionGuardar = existingConfig?.licenciaCodigo || 'recuperada'

  const config = await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: {
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaEstado: 'activa',
      licenciaUltimoCheck: new Date()
    },
    create: {
      id: 'config',
      licenciaCodigo: codigoActivacionGuardar,
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaEstado: 'activa',
      licenciaUltimoCheck: new Date()
    }
  })

  return config
}
