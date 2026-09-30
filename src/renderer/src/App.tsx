import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardScreen } from './screens/DashboardScreen'
import { ProductosScreen } from './screens/ProductosScreen'
import { ProveedoresScreen } from './screens/ProveedoresScreen'
import { RecetasScreen } from './screens/RecetasScreen'
import { POSScreen } from './screens/POSScreen'
import { VentasScreen } from './screens/VentasScreen'
import { ConfiguracionScreen } from './screens/ConfiguracionScreen'
import { LoginScreen } from './screens/LoginScreen'
import { CajaScreen } from './screens/CajaScreen'
import { HistorialCajasScreen } from './screens/HistorialCajasScreen'
import { ReportesScreen } from './screens/ReportesScreen'
import { DeliveryScreen } from './screens/DeliveryScreen'

/**
 * Context de licencia — permite que AppLayout lea el estado verificado
 * directamente del AuthGuard sin hacer un getConfiguracion() separado
 * que podría leerse antes de que el backend actualice la BD.
 */
const LicenciaContext = createContext<string>('activa')
export const useLicenciaEstado = () => useContext(LicenciaContext)

/**
 * AuthGuard — protege las rutas de la app.
 *
 * Al montar, verifica:
 *   1. Si `sesionActiva` es true (el usuario está logueado)
 *   2. Si la licencia está en un estado válido ('activa' o 'gracia')
 *
 * Si la sesión no está activa → redirige a /login
 * Si la licencia está bloqueada → redirige a /login
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<string | null>(null)
  const [sesionActiva, setSesionActiva] = useState<boolean | null>(null)

  useEffect(() => {
    const timeout = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de seguridad (10s)')), 10000)
    )

    // Verificar sesión y licencia en paralelo
    Promise.all([
      (window as any).api.getConfiguracion(),
      Promise.race([
        (window as any).api.verificarEstadoLocal(),
        timeout
      ])
    ])
    .then(([config, estadoLocal]: [any, string]) => {
      setSesionActiva(config?.sesionActiva === true)
      setEstado(estadoLocal)

      // Si la sesión está activa, lanzar chequeo silencioso en background
      if (config?.sesionActiva) {
        ;(window as any).api.verificarRenovacionSilenciosa().then((nuevoEstado: string | undefined) => {
          if (nuevoEstado && nuevoEstado !== estadoLocal) {
            setEstado(nuevoEstado)
          }
        })
      }
    })
    .catch((error) => {
      console.error('Error o timeout al verificar estado:', error)
      setEstado('bloqueada')
      setSesionActiva(false)
    })

    // Chequeo periódico cada 1 hora
    const intervalId = setInterval(() => {
      ;(window as any).api.verificarRenovacionSilenciosa().then((nuevoEstado: string | undefined) => {
        if (nuevoEstado) {
          setEstado(nuevoEstado)
        }
      })
    }, 3600000)

    return () => clearInterval(intervalId)
  }, [])

  if (estado === null || sesionActiva === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Verificando sesión...
      </div>
    )
  }

  // Si no hay sesión activa o la licencia está bloqueada → login
  if (!sesionActiva || estado === 'bloqueada') {
    return <Navigate to="/login" replace />
  }

  return (
    <LicenciaContext.Provider value={estado}>
      {children}
    </LicenciaContext.Provider>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />

        <Route path="/" element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }>
          <Route index element={<DashboardScreen />} />
          <Route path="caja" element={<CajaScreen />} />
          <Route path="pos" element={<POSScreen />} />
          <Route path="productos" element={<ProductosScreen />} />
          <Route path="proveedores" element={<ProveedoresScreen />} />
          <Route path="recetas" element={<RecetasScreen />} />
          <Route path="ventas" element={<VentasScreen />} />
          <Route path="delivery" element={<DeliveryScreen />} />
          <Route path="historial-cajas" element={<HistorialCajasScreen />} />
          <Route path="reportes" element={<ReportesScreen />} />
          <Route path="configuracion" element={<ConfiguracionScreen />} />
        </Route>

        {/* Compatibilidad: si alguien tiene /activar en la URL, redirigir a /login */}
        <Route path="/activar" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
