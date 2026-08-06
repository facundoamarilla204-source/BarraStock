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

import { fork } from 'child_process'

/**
 * Runs missing schema alterations on a dirty database so we can safely enable Prisma Migrations.
 */
async function baselineDirtyDatabase() {
  console.log('Verificando si la base de datos necesita baselining...')
  try {
    const result = await prisma.$queryRawUnsafe<{name: string}[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'`
    )
    
    // If the migrations table doesn't exist, check if other tables exist
    if (result.length === 0) {
      const checkVenta = await prisma.$queryRawUnsafe<{name: string}[]>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='Venta'`
      )

      if (checkVenta.length === 0) {
        console.log('Base de datos nueva detectada. Saltando baselining.')
        return
      }

      console.log('Base de datos antigua detectada. Ejecutando sentencias de baselining...')
      
      // We manually add everything that Prisma would add, ignoring errors if they already exist
      const alterStatements = [
        `ALTER TABLE Venta ADD COLUMN numero INTEGER`,
        `ALTER TABLE Venta ADD COLUMN cajaSesionId TEXT`,
        `ALTER TABLE Venta ADD COLUMN montoRecibido REAL`,
        `ALTER TABLE Venta ADD COLUMN vuelto REAL`,
        `ALTER TABLE Producto ADD COLUMN unidadMedida TEXT NOT NULL DEFAULT 'unidad'`,
        `ALTER TABLE Producto ADD COLUMN tamanioEnvase REAL`,
        `ALTER TABLE Producto ADD COLUMN vendiblePorUnidad INTEGER NOT NULL DEFAULT 1`,
        `ALTER TABLE Configuracion ADD COLUMN controlIva BOOLEAN NOT NULL DEFAULT false`,
        `ALTER TABLE Configuracion ADD COLUMN ivaPorcentaje REAL NOT NULL DEFAULT 21.0`,
        `ALTER TABLE Venta ADD COLUMN neto REAL`,
        `ALTER TABLE Venta ADD COLUMN iva REAL`,
        `ALTER TABLE Venta ADD COLUMN ivaPorcentaje REAL`,
        `ALTER TABLE DetalleVenta ADD COLUMN neto REAL`,
        `ALTER TABLE DetalleVenta ADD COLUMN iva REAL`,
      ]
      
      for (const statement of alterStatements) {
        try {
          await prisma.$executeRawUnsafe(statement)
          console.log(`Ejecutado: ${statement}`)
        } catch (e) {
          // Column probably exists, skip safely
        }
      }
      
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
      } catch (e) {}

      // Now we run `prisma migrate resolve` to mark past migrations as applied.
      console.log('Baselining: Marcando migraciones pasadas como resueltas...')
      await runPrismaCommand(['migrate', 'resolve', '--applied', '20260805023518_init'])
      await runPrismaCommand(['migrate', 'resolve', '--applied', '20260805173300_unify_producto_ingrediente'])
      await runPrismaCommand(['migrate', 'resolve', '--applied', '20260806180000_sync_schema'])
      console.log('Baselining completado.')
    }
  } catch (error) {
    console.error('Error durante el baselining:', error)
  }
}

/**
 * Runs a Prisma CLI command via child_process.fork in production, or exec in dev.
 */
function runPrismaCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let prismaPath = ''
    
    if (isProd) {
      prismaPath = path.join(process.resourcesPath, 'node_modules', 'prisma', 'build', 'index.js')
    } else {
      prismaPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
    }
    
    const schemaPath = isProd 
      ? path.join(process.resourcesPath, 'prisma', 'schema.prisma')
      : path.join(process.cwd(), 'prisma', 'schema.prisma')

    console.log(`Ejecutando: prisma ${args.join(' ')} con schema ${schemaPath}`)
    
    const child = fork(prismaPath, [...args, '--schema', schemaPath], {
      env: { 
        ...process.env, 
        DATABASE_URL: prismaUrl,
        ELECTRON_RUN_AS_NODE: '1'
      },
      stdio: 'pipe'
    })

    child.stdout?.on('data', (data) => console.log(data.toString()))
    child.stderr?.on('data', (data) => console.error(data.toString()))

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Prisma process exited with code ${code}`))
    })
  })
}

export async function runAutoMigrations() {
  try {
    // 1. Aseguramos que las bases de datos "sucias" se actualicen primero
    await baselineDirtyDatabase()
    
    // 2. Ejecutamos prisma migrate deploy de forma segura
    console.log('Ejecutando prisma migrate deploy...')
    await runPrismaCommand(['migrate', 'deploy'])
    console.log('Migraciones de Prisma aplicadas correctamente.')
    
  } catch (e) {
    console.error('Error ejecutando migraciones:', e)
  }
}
