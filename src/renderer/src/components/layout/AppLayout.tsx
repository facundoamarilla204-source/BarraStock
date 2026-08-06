import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Coffee, Settings, Receipt, AlertTriangle, BarChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function AppLayout() {
  const location = useLocation()
  const [config, setConfig] = useState<any>(null)
  const [updateReady, setUpdateReady] = useState<string | null>(null)

  useEffect(() => {
    ;(window as any).api.getConfiguracion().then((res: any) => {
      setConfig(res)
    })
    
    // Escuchar si hay una actualización lista
    if ((window as any).api.onUpdateReady) {
      ;(window as any).api.onUpdateReady((version: string) => {
        setUpdateReady(version)
      })
    }
  }, [])

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Caja', path: '/caja', icon: Receipt },
    { name: 'POS', path: '/pos', icon: ShoppingCart },
    { name: 'Ventas del Día', path: '/ventas', icon: Receipt },
    { name: 'Productos', path: '/productos', icon: Coffee },
    { name: 'Recetas', path: '/recetas', icon: Coffee },
    { name: 'Historial Cajas', path: '/historial-cajas', icon: Receipt },
    { name: 'Reportes', path: '/reportes', icon: BarChart },
    { name: 'Configuración', path: '/configuracion', icon: Settings }
  ]

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">BarraStock</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                )}
              >
                <Icon className="h-5 w-5" />
                {link.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {config?.licenciaEstado === 'gracia' && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-500 p-3 flex items-center justify-center gap-2 text-sm shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Tu licencia venció. <b>Renová en barrastock.com</b> para no perder acceso. 
              Mientras tanto, podés seguir operando por unos días más.
            </span>
          </div>
        )}
        {updateReady && (
          <div className="bg-blue-600 border-b border-blue-700 text-white p-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm shrink-0 shadow-sm z-50">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Hay una actualización lista (<b>v{updateReady}</b>).
              </span>
            </span>
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que querés reiniciar ahora? Cualquier venta en curso en el POS se perderá si no la cobraste.')) {
                  ;(window as any).api.relaunchAndUpdate()
                }
              }}
              className="bg-white text-blue-700 hover:bg-gray-100 font-semibold px-4 py-1.5 rounded-md transition-colors text-xs uppercase tracking-wider shadow-sm"
            >
              Reiniciar ahora
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
