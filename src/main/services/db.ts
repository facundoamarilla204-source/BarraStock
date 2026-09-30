import { app } from 'electron'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const isProd = app.isPackaged

export let dbPath: string
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

      // Now we run `prisma migrate resolve` equivalent by inserting into _prisma_migrations
      console.log('Baselining: Marcando migraciones pasadas como resueltas...')
      const crypto = require('crypto')
      const baselinedMigrations = ['20260805023518_init', '20260805173300_unify_producto_ingrediente', '20260806180000_sync_schema']
      for (const m of baselinedMigrations) {
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, current_timestamp, ?, ?)`,
            crypto.randomUUID(), 'baselined-checksum', m, 1
          )
        } catch (e) {} // Ignorar si ya existe
      }
      console.log('Baselining completado.')
    }
  } catch (error) {
    console.error('Error durante el baselining:', error)
  }
}

  const crypto = require('crypto');

  function getPrismaMigrationsDir() {
    return isProd 
      ? path.join(process.resourcesPath, 'prisma', 'migrations')
      : path.join(process.cwd(), 'prisma', 'migrations')
  }

  async function runCustomMigrations() {
    console.log('Verificando migraciones pendientes (Custom Runner)...')
    
    // Crear tabla si no existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id"                    TEXT PRIMARY KEY NOT NULL,
          "checksum"              TEXT NOT NULL,
          "finished_at"           DATETIME,
          "migration_name"        TEXT NOT NULL,
          "logs"                  TEXT,
          "rolled_back_at"        DATETIME,
          "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
          "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
      )
    `)

    const applied = await prisma.$queryRawUnsafe<{migration_name: string}[]>(
      `SELECT migration_name FROM _prisma_migrations`
    ).catch(() => [])
    
    const appliedSet = new Set(applied.map(m => m.migration_name))
    
    const migrationsDir = getPrismaMigrationsDir()
    if (!fs.existsSync(migrationsDir)) {
      console.log('No se encontró el directorio de migraciones:', migrationsDir)
      return
    }

    const folders = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory() && !f.startsWith('.'))
    folders.sort()

    for (const folder of folders) {
      if (!appliedSet.has(folder)) {
        console.log(`Aplicando migración: ${folder}...`)
        try {
          const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
          if (fs.existsSync(sqlPath)) {
            const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
            await prisma.$executeRawUnsafe(sqlContent)
            
            const uuid = crypto.randomUUID()
            await prisma.$executeRawUnsafe(
              `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, current_timestamp, ?, ?)`,
              uuid, 'manual-checksum', folder, 1
            )
            console.log(`Migración completada: ${folder}`)
          }
        } catch (e) {
          console.error(`Error aplicando migración ${folder}:`, e)
          throw e
        }
      }
    }
    console.log('Todas las migraciones están al día.')
  }

export async function runAutoMigrations() {
  try {
    // 1. Aseguramos que las bases de datos "sucias" se actualicen primero (código legado)
    await baselineDirtyDatabase()
    
    // 2. Ejecutamos Custom Migrations Runner en lugar del CLI
    console.log('Ejecutando custom migration runner...')
    await runCustomMigrations()
    console.log('Migraciones personalizadas aplicadas correctamente.')
    
  } catch (e) {
    console.error('Error ejecutando migraciones, procediendo con fallback SQL manual:', e)
  }

  // 3. FALLBACK SEGURO: Debido a problemas en Electron con prisma migrate deploy,
  // ejecutamos manualmente CREATE TABLE y ALTER TABLE para las estructuras críticas.
  console.log('Verificando y aplicando estructuras de base de datos seguras (Fallback)...')
  
  const alterStatements = [
    // Producto
    `ALTER TABLE Producto ADD COLUMN codigoBarras TEXT`,
    `ALTER TABLE Producto ADD COLUMN unidadMedida TEXT NOT NULL DEFAULT 'unidad'`,
    `ALTER TABLE Producto ADD COLUMN tamanioEnvase REAL`,
    `ALTER TABLE Producto ADD COLUMN vendiblePorUnidad INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE Producto ADD COLUMN imagen TEXT`,
    
    // Venta
    `ALTER TABLE Venta ADD COLUMN numero INTEGER`,
    `ALTER TABLE Venta ADD COLUMN cajaSesionId TEXT`,
    `ALTER TABLE Venta ADD COLUMN motivoAnulacion TEXT`,
    `ALTER TABLE Venta ADD COLUMN montoRecibido REAL`,
    `ALTER TABLE Venta ADD COLUMN vuelto REAL`,
    `ALTER TABLE Venta ADD COLUMN neto REAL`,
    `ALTER TABLE Venta ADD COLUMN iva REAL`,
    `ALTER TABLE Venta ADD COLUMN ivaPorcentaje REAL`,
    `ALTER TABLE Venta ADD COLUMN costoDelivery REAL DEFAULT 0`,
    `ALTER TABLE Venta ADD COLUMN pagoDelivery REAL DEFAULT 0`,
    `ALTER TABLE Venta ADD COLUMN gananciaBruta REAL`,
    `ALTER TABLE Venta ADD COLUMN subtotal REAL DEFAULT 0`,
    `ALTER TABLE Venta ADD COLUMN descuento REAL DEFAULT 0`,
    `ALTER TABLE Venta ADD COLUMN tipoDescuento TEXT`,
    `ALTER TABLE Venta ADD COLUMN valorDescuento REAL`,
    
    // CajaSesion
    `ALTER TABLE CajaSesion ADD COLUMN totalDebito REAL`,
    `ALTER TABLE CajaSesion ADD COLUMN totalCredito REAL`,
    `ALTER TABLE CajaSesion ADD COLUMN totalQR REAL`,
    
    // Configuracion
    `ALTER TABLE Configuracion ADD COLUMN controlIva BOOLEAN NOT NULL DEFAULT 0`,
    `ALTER TABLE Configuracion ADD COLUMN ivaPorcentaje REAL NOT NULL DEFAULT 21.0`,
    `ALTER TABLE Configuracion ADD COLUMN porcentajeAlertaStock REAL NOT NULL DEFAULT 10`,
    `ALTER TABLE Configuracion ADD COLUMN porcentajeDelivery REAL NOT NULL DEFAULT 100`,
    `ALTER TABLE Configuracion ADD COLUMN licenciaEmail TEXT`,
    `ALTER TABLE Configuracion ADD COLUMN licenciaCodigo TEXT`,
    `ALTER TABLE Configuracion ADD COLUMN licenciaVence DATETIME`,
    `ALTER TABLE Configuracion ADD COLUMN licenciaEstado TEXT NOT NULL DEFAULT 'bloqueada'`,
    `ALTER TABLE Configuracion ADD COLUMN licenciaUltimoCheck DATETIME`,
    `ALTER TABLE Configuracion ADD COLUMN sesionActiva BOOLEAN NOT NULL DEFAULT 0`,
    `ALTER TABLE Configuracion ADD COLUMN passwordHashLocal TEXT`,
    `ALTER TABLE Configuracion ADD COLUMN machineId TEXT`,
    
    // DetalleVenta
    `ALTER TABLE DetalleVenta ADD COLUMN neto REAL`,
    `ALTER TABLE DetalleVenta ADD COLUMN iva REAL`,
    `ALTER TABLE DetalleVenta ADD COLUMN costoUnitario REAL`,
    `ALTER TABLE DetalleVenta ADD COLUMN ganancia REAL`,
    `ALTER TABLE DetalleVenta ADD COLUMN descuento REAL DEFAULT 0`,
    `ALTER TABLE DetalleVenta ADD COLUMN tipoDescuento TEXT`,
    `ALTER TABLE DetalleVenta ADD COLUMN valorDescuento REAL`,
    `ALTER TABLE DetalleVenta ADD COLUMN total REAL`
  ]

  for (const statement of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(statement)
      console.log(`Fallback SQL Ejecutado: ${statement}`)
    } catch (e) {
      // Si falla, probablemente la columna ya existe
    }
  }

  const createTables = [
    `CREATE TABLE IF NOT EXISTS "Proveedor" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "razonSocial" TEXT NOT NULL,
      "cuit" TEXT,
      "contacto" TEXT,
      "telefono" TEXT,
      "whatsapp" TEXT,
      "email" TEXT,
      "direccion" TEXT,
      "localidad" TEXT,
      "tipo" TEXT,
      "condicionPago" TEXT,
      "diasVencimiento" INTEGER DEFAULT 0,
      "limiteCredito" REAL DEFAULT 0,
      "notas" TEXT,
      "activo" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "Compra" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "proveedorId" TEXT NOT NULL,
      "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "numero" TEXT,
      "total" REAL NOT NULL DEFAULT 0,
      "importePagado" REAL NOT NULL DEFAULT 0,
      "saldoPendiente" REAL NOT NULL DEFAULT 0,
      "estado" TEXT NOT NULL DEFAULT 'pendiente',
      "fechaVencimiento" DATETIME,
      "observaciones" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "DetalleCompra" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "compraId" TEXT NOT NULL,
      "productoId" TEXT NOT NULL,
      "cantidad" REAL NOT NULL,
      "costoUnitario" REAL NOT NULL,
      "subtotal" REAL NOT NULL,
      CONSTRAINT "DetalleCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "DetalleCompra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "PagoProveedor" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "proveedorId" TEXT NOT NULL,
      "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "importe" REAL NOT NULL,
      "medioPago" TEXT NOT NULL,
      "referencia" TEXT,
      "observaciones" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "PagoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ProveedorMovimiento" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "proveedorId" TEXT NOT NULL,
      "compraId" TEXT,
      "pagoId" TEXT,
      "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "tipo" TEXT NOT NULL,
      "descripcion" TEXT NOT NULL,
      "monto" REAL NOT NULL,
      "saldoResultante" REAL NOT NULL,
      CONSTRAINT "ProveedorMovimiento_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ProveedorMovimiento_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "ProveedorMovimiento_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "PagoProveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "ProductoProveedor" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "proveedorId" TEXT NOT NULL,
      "productoId" TEXT NOT NULL,
      "ultimoCosto" REAL,
      "fechaUltimaCompra" DATETIME,
      "esPrincipal" BOOLEAN NOT NULL DEFAULT 0,
      CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "PagoVenta" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ventaId" TEXT NOT NULL,
      "medioPago" TEXT NOT NULL,
      "monto" REAL NOT NULL,
      "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PagoVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`
  ]

  for (const tableSql of createTables) {
    try {
      await prisma.$executeRawUnsafe(tableSql)
    } catch (e) {
      console.error('Error al crear tabla en fallback SQL:', e)
    }
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProductoProveedor_proveedorId_productoId_key" ON "ProductoProveedor"("proveedorId", "productoId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PagoVenta_ventaId_idx" ON "PagoVenta"("ventaId")`)
  } catch (e) {}

  console.log('Validación de estructura terminada.')
}
