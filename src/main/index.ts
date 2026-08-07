import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipcHandlers'
import { setupAutoUpdater, checkForUpdatesSilently } from './updaterService'
import { 
  verificarEstadoLocal, 
  solicitarRecuperacionLicencia,
  confirmarRecuperacionLicencia 
} from './services/licenciaService'
import { runAutoMigrations } from './services/db'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'BarraStock',
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.handle('verificar-estado-licencia', async () => {
    return await verificarEstadoLocal()
  })

  ipcMain.handle('solicitar-recuperacion-licencia', async (_, email) => {
    try {
      return await solicitarRecuperacionLicencia(email)
    } catch (error: any) {
      return { error: error.message }
    }
  })

  ipcMain.handle('confirmar-recuperacion-licencia', async (_, email, codigo) => {
    try {
      await confirmarRecuperacionLicencia(email, codigo)
      return { success: true }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.barrastock.app')
  
  try {
    await runAutoMigrations()
  } catch (err) {
    console.error('Error in runAutoMigrations:', err)
  }

  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register all IPC endpoints
  registerIpcHandlers()

  const mainWindow = createWindow()
  setupAutoUpdater(mainWindow)
  checkForUpdatesSilently()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
