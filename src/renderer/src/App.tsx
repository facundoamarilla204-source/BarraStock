import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardScreen } from './screens/DashboardScreen'
import { ProductosScreen } from './screens/ProductosScreen'
import { RecetasScreen } from './screens/RecetasScreen'
import { POSScreen } from './screens/POSScreen'
import { VentasScreen } from './screens/VentasScreen'
import { ConfiguracionScreen } from './screens/ConfiguracionScreen'
import { ActivacionScreen } from './screens/ActivacionScreen'
import { CajaScreen } from './screens/CajaScreen'
import { HistorialCajasScreen } from './screens/HistorialCajasScreen'
import { ReportesScreen } from './screens/ReportesScreen'

/**
 * AuthGuard — protege las rutas de la app según el estado de la licencia.
 *
 * Al montar, ejecuta checkLicencia (que corre todo el flujo offline-first
 * del backend) y decide:
 *   - 'activa' o 'gracia' → deja pasar (gracia muestra banner en AppLayout)
 *   - 'bloqueada' → redirige a /activar, diferenciando:
 *       • Primera vez (sin email guardado) → modo 'activar' (formulario)
 *       • Licencia expirada (con email) → modo 'bloqueada' (pantalla de reintentar)
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<string | null>(null)
  const [tieneEmail, setTieneEmail] = useState(false)

  useEffect(() => {
    // Iniciar chequeo silencioso en background
    ;(window as any).api.verificarRenovacionSilenciosa()

    // Obtener estado local inmediatamente, con timeout de seguridad de 10s
    const timeout = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de seguridad (10s)')), 10000)
    )

    Promise.race([
      (window as any).api.verificarEstadoLocal(),
      timeout
    ])
    .then((estadoLocal: string) => {
      setEstado(estadoLocal)
    })
    .catch((error) => {
      console.error('Error o timeout al verificar estado local:', error)
      // Si falla localmente por BD rota o cualquier otra cosa, lo mandamos a bloqueada/activar 
      // para salir de la pantalla de carga infinita.
      setEstado('bloqueada')
    })

    // También obtenemos la config para saber si ya se activó antes
    ;(window as any).api.getConfiguracion().then((config: any) => {
      setTieneEmail(!!config?.licenciaEmail)
    }).catch(() => {
      setTieneEmail(false)
    })
  }, [])

  if (estado === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Verificando licencia...
      </div>
    )
  }

  if (estado === 'bloqueada') {
    const modo = tieneEmail ? 'bloqueada' : 'activar'
    return <Navigate to="/activar" replace state={{ modo }} />
  }

  return <>{children}</>
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/activar" element={<ActivacionScreen />} />

        <Route path="/" element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }>
          <Route index element={<DashboardScreen />} />
          <Route path="caja" element={<CajaScreen />} />
          <Route path="pos" element={<POSScreen />} />
          <Route path="productos" element={<ProductosScreen />} />
          <Route path="recetas" element={<RecetasScreen />} />
          <Route path="ventas" element={<VentasScreen />} />
          <Route path="historial-cajas" element={<HistorialCajasScreen />} />
          <Route path="reportes" element={<ReportesScreen />} />
          <Route path="configuracion" element={<ConfiguracionScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
