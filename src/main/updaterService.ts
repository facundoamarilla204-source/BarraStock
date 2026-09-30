import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Configurar logs de updater
  autoUpdater.logger = log
  ;(autoUpdater.logger as any).transports.file.level = 'info'

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Eventos
  autoUpdater.on('checking-for-update', () => log.info('[Updater] Checking for update...'))
  autoUpdater.on('update-available', (info) => {
    log.info(`[Updater] Update available: ${info.version}`)
    mainWindow.webContents.send('update-available', { version: info.version })
  })
  autoUpdater.on('update-not-available', () => log.info('[Updater] Update not available.'))
  
  autoUpdater.on('error', (err) => {
    log.warn('[Updater] Error in auto-updater:', err.message)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`[Updater] Update downloaded: ${info.version}`)
    mainWindow.webContents.send('update-ready', { version: info.version })
  })
}

export function checkForUpdatesSilently() {
  if (process.env.NODE_ENV === 'development') return

  try {
    autoUpdater.checkForUpdatesAndNotify()
  } catch (error: any) {
    log.warn('[Updater] Could not trigger update check:', error.message)
  }
}

export async function checkUpdatesManual(): Promise<{ success: boolean; status: string; version?: string }> {
  if (process.env.NODE_ENV === 'development') {
    return { success: true, status: 'up-to-date', version: 'dev' }
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    
    if (result && result.updateInfo) {
      // Comparar versión actual con la descargada/disponible
      const currentVersion = autoUpdater.currentVersion.version
      const newVersion = result.updateInfo.version

      if (newVersion === currentVersion) {
        return { success: true, status: 'up-to-date' }
      } else {
        return { success: true, status: 'downloading', version: newVersion }
      }
    }
    
    return { success: true, status: 'up-to-date' }
  } catch (error: any) {
    log.warn('[Updater] Manual check error:', error.message)
    const errorString = String(error.message || '').toLowerCase()
    if (errorString.includes('403') || errorString.includes('rate limit')) {
      return { success: false, status: 'rate_limit' }
    }
    return { success: false, status: 'error' }
  }
}

export function relaunchAndUpdate() {
  autoUpdater.quitAndInstall()
}
