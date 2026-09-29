import { ipcMain, dialog } from 'electron'
import * as productoService from './services/productoService'
import * as recetaService from './services/recetaService'
import * as configuracionService from './services/configuracionService'
import * as licenciaService from './services/licenciaService'
import * as seedService from './services/seedService'
import * as ventaService from './services/ventaService'
import { cajaService } from './services/cajaService'
import { checkUpdatesManual, relaunchAndUpdate } from './updaterService'
import { backupService } from './services/backupService'
import * as proveedorService from './services/proveedorService'
export function registerIpcHandlers() {
  // Test Ping
  ipcMain.on('ping', () => console.log('pong'))

  // Productos (unificado: incluye ex-ingredientes)
  ipcMain.handle('productos:get', async () => await productoService.getProductos())
  ipcMain.handle('productos:create', async (_, data) => await productoService.createProducto(data))
  ipcMain.handle('productos:update', async (_, id, data) => await productoService.updateProducto(id, data))
  ipcMain.handle('productos:delete', async (_, id) => await productoService.deleteProducto(id))

  // Recetas
  ipcMain.handle('recetas:get', async () => await recetaService.getRecetas())
  ipcMain.handle('recetas:create', async (_, data) => await recetaService.createReceta(data))
  ipcMain.handle('recetas:update', async (_, id, data) => await recetaService.updateReceta(id, data))
  ipcMain.handle('recetas:delete', async (_, id) => await recetaService.deleteReceta(id))

  // Proveedores
  ipcMain.handle('proveedores:get', async (_, filtros) => await proveedorService.getProveedores(filtros))
  ipcMain.handle('proveedores:getById', async (_, id) => await proveedorService.getProveedorById(id))
  ipcMain.handle('proveedores:create', async (_, data) => await proveedorService.createProveedor(data))
  ipcMain.handle('proveedores:update', async (_, id, data) => await proveedorService.updateProveedor(id, data))
  ipcMain.handle('proveedores:toggleActivo', async (_, id) => await proveedorService.toggleProveedorActivo(id))
  ipcMain.handle('proveedores:getMovimientos', async (_, id) => await proveedorService.getProveedorMovimientos(id))
  ipcMain.handle('proveedores:registrarPago', async (_, id, data) => await proveedorService.registrarPagoProveedor(id, data))

  ipcMain.handle('proveedores:getCompras', async (_, proveedorId) => await proveedorService.getComprasByProveedor(proveedorId))
  ipcMain.handle('proveedores:registrarCompra', async (_, proveedorId, data) => await proveedorService.registrarCompra(proveedorId, data))
  ipcMain.handle('proveedores:anularCompra', async (_, compraId) => await proveedorService.anularCompra(compraId))
  // Reportes
  ipcMain.handle('reportes:get-avanzado', async (_, data) => await ventaService.getReporteAvanzado(new Date(data.desde), new Date(data.hasta)))

  // Configuración
  ipcMain.handle('configuracion:get', async () => await configuracionService.getConfiguracion())
  ipcMain.handle('configuracion:update', async (_, data) => await configuracionService.updateConfiguracion(data))

  // Licencias
  ipcMain.handle('licencia:activar', async (_, codigo, email) => {
    try {
      return { success: true, data: await licenciaService.activarLicencia(codigo, email) }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
  ipcMain.handle('licencia:verificar-local', async () => await licenciaService.verificarEstadoLocal())
  ipcMain.handle('licencia:renovacion-silenciosa', async () => await licenciaService.verificarRenovacionSilenciosa())
  
  // Ventas
  ipcMain.handle('ventas:get', async () => await ventaService.getVentas())
  ipcMain.handle('ventas:procesar', async (_, carrito, medioPago, montoRecibido, vuelto, costoDelivery) => {
    try {
      return { success: true, data: await ventaService.procesarVenta(carrito, medioPago, montoRecibido, vuelto, costoDelivery) }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
  
  ipcMain.handle('ventas:anular', async (_, ventaId, motivo) => {
    try {
      return { success: true, data: await ventaService.anularVenta(ventaId, motivo) }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  // Dashboard
  ipcMain.handle('dashboard:metrics', async () => await ventaService.getDashboardMetrics())

  // Caja
  ipcMain.handle('caja:abierta', async () => await cajaService.getCajaAbierta())
  ipcMain.handle('caja:abrir', async (_, fondoInicial) => {
    try {
      return { success: true, data: await cajaService.abrirCaja(fondoInicial) }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
  ipcMain.handle('caja:cerrar', async () => {
    try {
      return { success: true, data: await cajaService.cerrarCaja() }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
  ipcMain.handle('caja:historial', async () => await cajaService.getHistorialCajas())
  ipcMain.handle('caja:get-con-ventas', async (_, cajaId) => await cajaService.getCajaConVentas(cajaId))
  
  ipcMain.handle('caja:ultima-cerrada', async () => await cajaService.getUltimaCajaCerrada())
  ipcMain.handle('caja:reabrir', async (_, cajaId) => {
    try {
      return { success: true, data: await cajaService.reabrirCaja(cajaId) }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  // Opcional para test manual (ya no lo llamaremos `get-config-count` directo, usamos get)
  ipcMain.handle('get-config-count', async () => {
    // Solo para compatibilidad con la prueba de Fase 1
    const config = await configuracionService.getConfiguracion()
    return config ? 1 : 0
  })

  // Seed
  ipcMain.handle('seed:run', async () => {
    try {
      return await seedService.runSeed()
    } catch (e: any) {
      console.error(e)
      return { success: false, message: e.message }
    }
  })

  // Updater / Version
  ipcMain.handle('app:version', () => {
    const { app } = require('electron')
    return app.getVersion()
  })
  
  ipcMain.handle('app:check-updates', async () => {
    return await checkUpdatesManual()
  })

  ipcMain.handle('app:relaunch-update', () => {
    relaunchAndUpdate()
  })

  // Base de datos (Backup & Restore)
  ipcMain.handle('database:backup', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Seleccionar carpeta para copia de seguridad',
        properties: ['openDirectory']
      })
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Operación cancelada' }
      }
      
      const destination = result.filePaths[0]
      const backupPath = await backupService.createBackup(destination)
      return { success: true, path: backupPath }
    } catch (e: any) {
      console.error(e)
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('database:restore', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Seleccionar copia de seguridad',
        filters: [{ name: 'Base de datos de SQLite', extensions: ['db'] }],
        properties: ['openFile']
      })
      
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Operación cancelada' }
      }
      
      const source = result.filePaths[0]
      await backupService.restoreBackup(source)
      return { success: true }
    } catch (e: any) {
      console.error(e)
      return { success: false, message: e.message }
    }
  })
}
