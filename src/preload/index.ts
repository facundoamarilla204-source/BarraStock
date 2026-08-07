import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Productos (unificado: incluye ex-ingredientes)
  getProductos: () => ipcRenderer.invoke('productos:get'),
  createProducto: (data: any) => ipcRenderer.invoke('productos:create', data),
  updateProducto: (id: string, data: any) => ipcRenderer.invoke('productos:update', id, data),
  deleteProducto: (id: string) => ipcRenderer.invoke('productos:delete', id),

  // Recetas
  getRecetas: () => ipcRenderer.invoke('recetas:get'),
  createReceta: (data: any) => ipcRenderer.invoke('recetas:create', data),
  updateReceta: (id: string, data: any) => ipcRenderer.invoke('recetas:update', id, data),
  deleteReceta: (id: string) => ipcRenderer.invoke('recetas:delete', id),

  // Configuración
  getConfiguracion: () => ipcRenderer.invoke('configuracion:get'),
  updateConfiguracion: (data: any) => ipcRenderer.invoke('configuracion:update', data),
  activarLicencia: (codigo: string, email: string) => ipcRenderer.invoke('licencia:activar', codigo, email),
  verificarEstadoLocal: () => ipcRenderer.invoke('licencia:verificar-local'),
  verificarRenovacionSilenciosa: () => ipcRenderer.invoke('licencia:renovacion-silenciosa'),
  solicitarRecuperacionLicencia: (email: string) => ipcRenderer.invoke('solicitar-recuperacion-licencia', email),
  confirmarRecuperacionLicencia: (email: string, codigo: string) => ipcRenderer.invoke('confirmar-recuperacion-licencia', email, codigo),
  
  // Ventas & Dashboard
  procesarVenta: (carrito: any[], medioPago?: string, montoRecibido?: number, vuelto?: number) => ipcRenderer.invoke('ventas:procesar', carrito, medioPago, montoRecibido, vuelto),
  anularVenta: (ventaId: string, motivo: string) => ipcRenderer.invoke('ventas:anular', { ventaId, motivo }),
  
  // Reportes
  getReporteAvanzado: (desde: string, hasta: string) => ipcRenderer.invoke('reportes:get-avanzado', { desde, hasta }),

  getVentas: () => ipcRenderer.invoke('ventas:get'),
  getDashboardMetrics: () => ipcRenderer.invoke('dashboard:metrics'),

  // Caja
  getCajaAbierta: () => ipcRenderer.invoke('caja:abierta'),
  abrirCaja: (fondoInicial: number) => ipcRenderer.invoke('caja:abrir', fondoInicial),
  cerrarCaja: () => ipcRenderer.invoke('caja:cerrar'),
  getHistorialCajas: () => ipcRenderer.invoke('caja:historial'),
  getCajaConVentas: (cajaId: string) => ipcRenderer.invoke('caja:get-con-ventas', cajaId),
  getUltimaCajaCerrada: () => ipcRenderer.invoke('caja:ultima-cerrada'),
  reabrirCaja: (cajaId: string) => ipcRenderer.invoke('caja:reabrir', cajaId),

  // Seed
  runSeed: () => ipcRenderer.invoke('seed:run'),

  // App / Updater
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkUpdates: () => ipcRenderer.invoke('app:check-updates'),
  relaunchAndUpdate: () => ipcRenderer.invoke('app:relaunch-update'),
  onUpdateReady: (callback: (version: string) => void) => {
    // Escuchar el evento una vez que se envíe desde main
    ipcRenderer.on('update-ready', (_event, data) => callback(data.version))
  },

  // Backup & Restore
  backupDatabase: () => ipcRenderer.invoke('database:backup'),
  restoreDatabase: () => ipcRenderer.invoke('database:restore')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
