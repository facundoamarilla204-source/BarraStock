import { app } from 'electron'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const isProd = app.isPackaged

let dbPath: string
let prismaUrl: string

if (isProd) {
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'database.db')
  
  // Si la BD no existe (primer arranque), copiamos la plantilla empaquetada
  if (!fs.existsSync(dbPath)) {
    const templatePath = path.join(process.resourcesPath, 'template.db')
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath)
      console.log('Base de datos inicial copiada a:', dbPath)
    } else {
      console.error('No se encontró template.db en:', templatePath)
    }
  }

  // En producción, PrismaClient necesita saber dónde está el query engine si lo movemos
  // En este caso electron-vite + builder a veces pierden la ruta del engine.
  // Configuramos la variable de entorno para que apunte al engine copiado en extraResources
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(process.resourcesPath, 'prisma-engine', 'query_engine-windows.dll.node')
  
  prismaUrl = `file:${dbPath}`
} else {
  // En desarrollo usamos dev.db
  dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
  prismaUrl = `file:${dbPath}`
}

// Inicialización
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: prismaUrl
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
