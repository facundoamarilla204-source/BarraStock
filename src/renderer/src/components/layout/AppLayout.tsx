import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Settings, Receipt, AlertTriangle, BarChart, Menu, ChevronLeft, Motorbike, Package, ChefHat, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useLicenciaEstado } from '../../App'

export function AppLayout() {
  const location = useLocation()
  const estadoLicencia = useLicenciaEstado()
  const [updateReady, setUpdateReady] = useState<string | null>(null)
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    return saved === 'true' || window.innerWidth < 1100
  })

  // Collapso automático en redimensionamiento si la ventana se achica
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setIsCollapsed(true)
      } else {
        const saved = localStorage.getItem('sidebar_collapsed')
        setIsCollapsed(saved === 'true')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    const newVal = !isCollapsed
    setIsCollapsed(newVal)
    localStorage.setItem('sidebar_collapsed', newVal.toString())
  }

  useEffect(() => {
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
    { name: 'Delivery', path: '/delivery', icon: Motorbike },
    { name: 'Productos', path: '/productos', icon: Package },
    { name: 'Proveedores', path: '/proveedores', icon: Building2 },
    { name: 'Recetas', path: '/recetas', icon: ChefHat },
    { name: 'Historial Cajas', path: '/historial-cajas', icon: Receipt },
    { name: 'Reportes', path: '/reportes', icon: BarChart },
    { name: 'Configuración', path: '/configuracion', icon: Settings }
  ]

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn("h-16 flex items-center border-b border-gray-800", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
          {!isCollapsed && <h1 className="text-xl font-bold text-blue-400">BarraStock</h1>}
          <button onClick={toggleSidebar} className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                title={isCollapsed ? link.name : undefined}
                className={cn(
                  'flex items-center rounded-md transition-colors font-medium',
                  isCollapsed ? 'justify-center p-2 mx-auto w-10 h-10' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                )}
              >
                <Icon className={cn("shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5")} />
                {!isCollapsed && <span className="truncate text-sm">{link.name}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {estadoLicencia === 'gracia' && (
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
