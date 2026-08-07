import fs from 'fs'
import path from 'path'

// Mock Electron
const electronMock = {
  app: {
    isPackaged: false,
    getPath: () => __dirname,
    relaunch: () => console.log('Mock: App relaunched'),
    exit: () => console.log('Mock: App exited')
  }
}

// We need to inject the mock into the module cache before requiring the actual modules
const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function(request: string) {
  if (request === 'electron') {
    return electronMock
  }
  return originalRequire.apply(this, arguments)
}

// Now we can safely import our services
import { backupService } from './src/main/services/backupService'
import { prisma } from './src/main/services/db'

async function runVerification() {
  console.log('--- Iniciando Verificación de Backup & Restore ---')
  
  try {
    // 1. Agregar un dato de prueba
    await prisma.producto.create({
      data: {
        id: 'test-verif',
        nombre: 'Producto de Prueba Verificacion',
        stock: 10,
        precio: 100,
        categoria: 'Test'
      }
    })
    console.log('[OK] Dato inicial creado.')
    
    // 2. Hacer Backup
    const backupDir = path.join(__dirname, 'backup_test_dir')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir)
    
    const backupPath = await backupService.createBackup(backupDir)
    console.log(`[OK] Backup creado en: ${backupPath}`)
    
    const stats = fs.statSync(backupPath)
    if (stats.size === 0) throw new Error('El backup está vacío')
    console.log(`[OK] Tamaño del backup: ${stats.size} bytes`)
    
    // 3. Modificar la base después del backup (simular un cambio)
    await prisma.producto.delete({ where: { id: 'test-verif' } })
    console.log('[OK] Dato de prueba eliminado (estado modificado posterior al backup).')
    
    // Verificamos que se haya eliminado
    let check = await prisma.producto.findUnique({ where: { id: 'test-verif' } })
    if (check) throw new Error('El producto no se eliminó')
    console.log('[OK] Confirmado: el producto no existe en la base de datos actual.')

    // 4. Restaurar el backup
    await backupService.restoreBackup(backupPath)
    console.log('[OK] Restore ejecutado (mockeando el reinicio).')
    
    // Como reiniciamos el cliente de prisma al desconectar, creamos uno temporal para verificar
    const { PrismaClient } = require('@prisma/client')
    const tempPrisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(__dirname, 'prisma/dev.db')}` } } })
    
    check = await tempPrisma.producto.findUnique({ where: { id: 'test-verif' } })
    if (!check) throw new Error('El producto no se restauró. El backup no funcionó correctamente.')
    console.log('[OK] Confirmado: el producto volvió a existir tras restaurar el backup.')
    
    await tempPrisma.$disconnect()
    
    // 5. Archivo inválido
    const invalidPath = path.join(backupDir, 'invalid.db')
    fs.writeFileSync(invalidPath, 'esto no es un sqlite, es un archivo de texto')
    try {
      await backupService.restoreBackup(invalidPath)
      throw new Error('Debería haber fallado al restaurar un archivo inválido')
    } catch (e: any) {
      if (e.message.includes('copia de seguridad válida')) {
        console.log('[OK] Restauración rechazada correctamente para archivo inválido.')
      } else {
        throw e
      }
    }
    
    // Limpieza
    fs.unlinkSync(backupPath)
    fs.unlinkSync(invalidPath)
    fs.rmdirSync(backupDir)
    
    // Dejamos la BD limpia
    const finalPrisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(__dirname, 'prisma/dev.db')}` } } })
    await finalPrisma.producto.delete({ where: { id: 'test-verif' } })
    await finalPrisma.$disconnect()
    
    console.log('--- Verificación 100% Exitosa ---')
    
  } catch (error) {
    console.error('Error durante la verificación:', error)
    process.exit(1)
  }
}

runVerification()
