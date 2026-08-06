import { ipcMain } from 'electron'
import * as productoService from './services/productoService'
import * as recetaService from './services/recetaService'
import * as configuracionService from './services/configuracionService'
import * as licenciaService from './services/licenciaService'
import * as seedService from './services/seedService'
import * as ventaService from './services/ventaService'
import { cajaService } from './services/cajaService'

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
  ipcMain.handle('ventas:procesar', async (_, carrito, medioPago, montoRecibido, vuelto) => {
    try {
      return { success: true, data: await ventaService.procesarVenta(carrito, medioPago, montoRecibido, vuelto) }
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
}
