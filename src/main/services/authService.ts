import { prisma } from './db'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { machineIdSync } from 'node-machine-id'
import os from 'os'

dotenv.config()

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Obtenemos o generamos el MachineID de esta computadora
export async function getLocalMachineId() {
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  if (config?.machineId) {
    return config.machineId
  }
  
  // Generar un machineId único basado en el hardware y guardarlo localmente
  const newMachineId = machineIdSync()
  await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: { machineId: newMachineId },
    create: { id: 'config', machineId: newMachineId }
  })
  return newMachineId
}

export async function loginLocal(_email: string, passwordString: string) {
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  if (!config) throw new Error('Configuración local no encontrada')

  // Si no tiene passwordHashLocal, podría requerir migración
  if (!config.passwordHashLocal) {
    throw new Error('MIGRATION_REQUIRED')
  }

  // Comparamos el hash offline
  const isMatch = await bcrypt.compare(passwordString, config.passwordHashLocal)
  if (!isMatch) {
    throw new Error('Credenciales incorrectas (Offline)')
  }

  // Verificamos que la licencia esté activa localmente
  const ahora = new Date()
  const vence = config.licenciaVence ? new Date(config.licenciaVence) : new Date(0)
  
  if (config.licenciaEstado === 'bloqueada') {
    throw new Error('La licencia local está bloqueada.')
  }

  if (vence.getTime() < ahora.getTime()) {
    // Está vencida, pero permitimos el período de gracia que ya se controla en `licenciaService.ts`
    // Solo bloqueamos si el estado ya pasó a bloqueada, lo cual hace el check principal.
  }

  // Abrimos la sesión local
  await prisma.configuracion.update({
    where: { id: 'config' },
    data: { sesionActiva: true }
  })
  
  return { success: true, offline: true }
}

export async function loginOnline(email: string, passwordString: string, supabaseAuthToken: string) {
  // 1. Llamar a la Edge Function
  const machineId = await getLocalMachineId()
  const nombreEquipo = os.hostname()

  const response = await fetch(`${SUPABASE_URL}/functions/v1/login_dispositivo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAuthToken}`, // El token JWT del cliente React
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ machineId, nombreEquipo })
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    console.error('[authService] loginOnline Edge Function Falló:', data)
    throw new Error(data.error || 'Error en autenticación online')
  }

  // 2. Si todo está bien, hashear la password y guardarla localmente junto con sesionActiva = true
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(passwordString, salt)

  await prisma.configuracion.upsert({
    where: { id: 'config' },
    update: { 
      sesionActiva: true,
      passwordHashLocal: hash,
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaCodigo: data.codigo_activacion || undefined
    },
    create: { 
      id: 'config', 
      sesionActiva: true,
      passwordHashLocal: hash,
      licenciaEmail: email,
      licenciaVence: new Date(data.fecha_vencimiento),
      licenciaCodigo: data.codigo_activacion || undefined
    }
  })

  return { success: true, offline: false, mensaje: data.mensaje }
}

export async function logout() {
  await prisma.configuracion.update({
    where: { id: 'config' },
    data: { sesionActiva: false }
  })
}

export async function migrarCuentaExistente(email: string, codigo: string, newPasswordString: string) {
  // Llama a una Edge Function para crear el Auth User
  const response = await fetch(`${SUPABASE_URL}/functions/v1/migrar_cuenta`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, codigo, password: newPasswordString })
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error al migrar la cuenta')
  }

  // Si fue exitoso, guardamos la password local
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(newPasswordString, salt)

  await prisma.configuracion.update({
    where: { id: 'config' },
    data: { 
      sesionActiva: true,
      passwordHashLocal: hash 
    }
  })

  return { success: true }
}

export async function getDispositivos() {
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  const machineId = await getLocalMachineId()

  if (!config || !config.licenciaEmail || !machineId) {
    throw new Error('Configuración incompleta')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/gestionar_dispositivos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      accion: 'listar',
      email: config.licenciaEmail,
      machine_id: machineId 
    })
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error al obtener dispositivos')
  }

  return { success: true, dispositivos: data.dispositivos, currentMachineId: machineId }
}

export async function revocarDispositivo(targetMachineId: string) {
  const config = await prisma.configuracion.findUnique({ where: { id: 'config' } })
  const machineId = await getLocalMachineId()

  if (!config || !config.licenciaEmail || !machineId) {
    throw new Error('Configuración incompleta')
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/gestionar_dispositivos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      accion: 'revocar',
      email: config.licenciaEmail,
      machine_id: machineId,
      target_machine_id: targetMachineId
    })
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Error al revocar dispositivo')
  }

  return { success: true }
}
