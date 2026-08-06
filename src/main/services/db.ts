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

  // En producción, PrismaClient encontrará el query engine automáticamente
  // porque hemos copiado node_modules/.prisma y node_modules/@prisma a process.resourcesPath
  
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

export async function runAutoMigrations() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Venta ADD COLUMN numero INTEGER`)
    console.log('Migración exitosa: Venta.numero agregada')
  } catch (e) {}

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Venta ADD COLUMN cajaSesionId TEXT`)
    console.log('Migración exitosa: Venta.cajaSesionId agregada')
  } catch (e) {}

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CajaSesion" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "numero" INTEGER NOT NULL,
          "fondoInicial" REAL NOT NULL DEFAULT 0,
          "fechaApertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "fechaCierre" DATETIME,
          "totalEfectivo" REAL,
          "totalTransferencia" REAL,
          "totalVentas" REAL,
          "totalEsperadoCaja" REAL,
          "cantidadVentas" INTEGER,
          "cantidadAnuladas" INTEGER,
          "estado" TEXT NOT NULL DEFAULT 'abierta'
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CajaSesion_numero_key" ON "CajaSesion"("numero")`)
    console.log('Migración exitosa: Tabla CajaSesion creada')
  } catch (e) {}

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN unidadMedida TEXT NOT NULL DEFAULT 'unidad'`)
    console.log('Migración exitosa: Producto.unidadMedida agregada')
  } catch (e) {}

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN tamanioEnvase REAL`)
    console.log('Migración exitosa: Producto.tamanioEnvase agregada')
  } catch (e) {}

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Producto ADD COLUMN vendiblePorUnidad INTEGER NOT NULL DEFAULT 1`)
    console.log('Migración exitosa: Producto.vendiblePorUnidad agregada')
  } catch (e) {}
}
