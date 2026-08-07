import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { prisma, dbPath } from './db'

class BackupService {
  /**
   * Crea una copia de seguridad de la base de datos en la ruta de destino.
   */
  async createBackup(destinationFolderPath: string): Promise<string> {
    try {
      // 1. Forzar un checkpoint del WAL para asegurar que el archivo .db está completo
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);')
      
      // 2. Construir el nombre del archivo con timestamp (ej: 2026-08-07-1430)
      const now = new Date()
      const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0')
      
      const fileName = `barrastock-backup-${timestamp}.db`
      const destinationFilePath = path.join(destinationFolderPath, fileName)
      
      // 3. Copiar el archivo
      fs.copyFileSync(dbPath, destinationFilePath)
      
      return destinationFilePath
    } catch (error: any) {
      console.error('Error al crear el backup:', error)
      throw new Error(`Error al crear el backup: ${error.message || 'Desconocido'}`)
    }
  }

  /**
   * Restaura la base de datos desde un archivo .db.
   */
  async restoreBackup(sourceFilePath: string): Promise<void> {
    try {
      // 1. Verificar si el archivo es SQLite válido leyendo el header (16 bytes)
      const buffer = Buffer.alloc(16)
      const fd = fs.openSync(sourceFilePath, 'r')
      fs.readSync(fd, buffer, 0, 16, 0)
      fs.closeSync(fd)
      
      const header = buffer.toString('utf8')
      if (header !== 'SQLite format 3\0') {
        throw new Error('El archivo seleccionado no es una copia de seguridad válida de BarraStock.')
      }

      // 2. Desconectar Prisma para liberar el archivo actual
      await prisma.$disconnect()

      // 3. Reemplazar el archivo
      fs.copyFileSync(sourceFilePath, dbPath)
      
      // 4. (Importante para WAL) Si existen archivos .db-wal y .db-shm, debemos eliminarlos para evitar corrupción cruzada
      const walPath = `${dbPath}-wal`
      const shmPath = `${dbPath}-shm`
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)

      // 5. Reiniciar la app
      if (app.isPackaged) {
        app.relaunch()
      } else {
        // En modo desarrollo (vite), el relaunch crashea o queda en blanco.
        // Mejor solo salir y que el developer reinicie npm run dev.
        console.log('Restauración completada en modo desarrollo. Saliendo...')
      }
      app.exit(0)
    } catch (error: any) {
      console.error('Error al restaurar el backup:', error)
      throw new Error(`Error al restaurar el backup: ${error.message || 'Desconocido'}`)
    }
  }
}

export const backupService = new BackupService()
