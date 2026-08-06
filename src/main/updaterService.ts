import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Configurar logs de updater
  autoUpdater.logger = log
  ;(autoUpdater.logger as any).transports.file.level = 'info'

  // No descargar automáticamente, queremos controlar el flujo o al menos saber que se descargó.
  // El PRD dice "descargarla en background, sin bloquear la UI". autoDownload=true hace esto por defecto.
  autoUpdater.autoDownload = true

  // No instalar automáticamente al cerrarse si no queremos forzar.
  autoUpdater.autoInstallOnAppQuit = true

  // Eventos
  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info(`[Updater] Update available: ${info.version}`)
  })

  autoUpdater.on('update-not-available', () => {
    log.info('[Updater] Update not available.')
  })

  autoUpdater.on('error', (err) => {
    // Errores de red o de parseo se ignoran silenciosamente para no interrumpir
    log.warn('[Updater] Error in auto-updater:', err.message)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`[Updater] Update downloaded: ${info.version}`)
    // Avisar a la ventana principal para mostrar el banner
    mainWindow.webContents.send('update-ready', { version: info.version })
  })
}

export function checkForUpdatesSilently() {
  // Ignorar en desarrollo porque electron-updater falla si no está empaquetado (a menos que se configure devUpdate)
  if (process.env.NODE_ENV === 'development') {
    return
  }

  try {
    // Si falla la red, electron-updater emitirá el evento 'error', que capturamos silenciosamente.
    autoUpdater.checkForUpdatesAndNotify()
  } catch (error: any) {
    log.warn('[Updater] Could not trigger update check:', error.message)
  }
}
