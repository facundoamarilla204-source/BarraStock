import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Receipt, TrendingUp, AlertCircle, Package, PackageOpen, Activity, DollarSign, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardScreen() {
  const [ventasHoy, setVentasHoy] = useState(0)
  const [totalHoy, setTotalHoy] = useState(0)
  const [alertasStock, setAlertasStock] = useState<any[]>([])
  
  const [metrics, setMetrics] = useState<any>(null)
  const [caja, setCaja] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const api = (window as any).api
      const config = await api.getConfiguracion()
      const threshold = config?.porcentajeAlertaStock || 10

      // Ventas (existente)
      const ventas = await api.getVentas()
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const ventasDeHoy = ventas.filter((v: any) => {
        const fechaVenta = new Date(v.fecha)
        return fechaVenta >= hoy && v.estado === 'activa'
      })

      setVentasHoy(ventasDeHoy.length)
      setTotalHoy(ventasDeHoy.reduce((acc: number, v: any) => acc + v.total, 0))

      // Nuevas Métricas Dashboard
      const dashMetrics = await api.getDashboardMetrics()
      setMetrics(dashMetrics)

      // Caja
      const cajaAbierta = await api.getCajaAbierta()
      setCaja(cajaAbierta)

      // Stock
      const productos = await api.getProductos()

      const bajas = [
        ...productos
          .map((p: any) => {
            let maxStock = p.stock
            if (p.tamanioEnvase && p.unidadMedida !== 'unidad') {
              maxStock = Math.floor(p.stock / p.tamanioEnvase)
            }
            return { ...p, maxStock, tipo: 'Producto' }
          })
          .filter((p: any) => p.maxStock < threshold)
      ]

      // Sort by stock asc
      bajas.sort((a, b) => a.stock - b.stock)
      setAlertasStock(bajas)
    } catch (error) {
      console.error('Error cargando dashboard', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return <div className="p-4 text-gray-400">Cargando dashboard...</div>
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard <span className="text-sm font-normal text-gray-500 ml-2">v1.0.9</span></h2>

      {/* ESTADO DE CAJA */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        {!caja ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <PackageOpen className="w-10 h-10 text-gray-600" />
            <div className="text-gray-300 font-medium">No hay caja abierta</div>
            <Link 
              to="/caja"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Ir a Caja
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Caja #{caja.numero} - ABIERTA
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Apertura: {new Date(caja.fechaApertura).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 mt-4 md:mt-0">
              <div>
                <p className="text-sm text-gray-500">Fondo Inicial</p>
                <p className="text-xl font-bold text-gray-200">${(caja.fondoInicial || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Efectivo</p>
                <p className="text-xl font-bold text-green-400">${(caja.totalEfectivo || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Esperado</p>
                <p className="text-xl font-bold text-blue-400">${(caja.totalEsperadoCaja || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* METRICAS PRINCIPALES Y MEDIOS DE PAGO */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Ventas de Hoy</CardTitle>
            <Receipt className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasHoy}</div>
            <p className="text-xs text-gray-500">Tickets emitidos hoy</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Recaudado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalHoy || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Total cobrado hoy</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Ganancia Bruta Hoy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalGananciaBruta || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas menos costo</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Efectivo Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalEfectivo || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas en efectivo</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Transferencia Hoy</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalTransferencia || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas por transferencia</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Débito Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalDebito || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas por débito</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Crédito Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalCredito || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas por crédito</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">QR Hoy</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalQR || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500">Ventas por QR</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CAJA ESTADO */}
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-gray-400" />
            Estado de Caja
          </h3>
          <Card className="bg-gray-900 border-gray-800 h-[300px]">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              {caja ? (
                <div className="text-center space-y-4">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-lg py-1 px-4">
                    Abierta
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Apertura</p>
                    <p className="font-medium">{new Date(caja.fechaApertura).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Monto Inicial</p>
                    <p className="text-2xl font-bold">${(caja.montoInicial || 0).toFixed(2)}</p>
                  </div>
                  <Link to="/caja">
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
                      Gestionar Caja
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <Badge variant="destructive" className="text-lg py-1 px-4 mb-4">
                    Cerrada
                  </Badge>
                  <p className="text-gray-400 mb-6">No hay ninguna caja abierta actualmente.</p>
                  <Link to="/caja">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
                      Abrir Caja
                    </button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* TOP PRODUCTOS */}
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Top 5 Más Vendidos
          </h3>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-[300px]">
            {!metrics?.topItems || metrics.topItems.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No hay datos suficientes
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 bg-gray-950/50">
                  <tr>
                    <th className="px-4 py-3">Ítem</th>
                    <th className="px-4 py-3 text-right">Cant.</th>
                    <th className="px-4 py-3 text-right">Recaudado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {metrics.topItems.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-200">{item.nombre}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{item.cantidad}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">${(item.totalFacturado || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ALERTAS INVENTARIO */}
        <div className="md:col-span-2">
          <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Alertas de Inventario
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alertasStock.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-800 rounded-lg text-center text-gray-500 bg-gray-900/50 col-span-full">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Todo en orden, no hay stock bajo.</p>
              </div>
            ) : (
              alertasStock.map(item => (
                <Card key={item.id} className="bg-gray-900 border-red-900/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{item.nombre}</div>
                      <div className="text-xs text-gray-400">{item.tipo}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.maxStock <= 0 ? 'destructive' : 'secondary'} className={item.maxStock <= 0 ? '' : 'bg-orange-500/20 text-orange-400'}>
                        {item.unidadMedida === 'unidad' 
                          ? `Stock: ${item.maxStock} ud` 
                          : `Stock: ${item.maxStock} un. (${item.stock} ${item.unidadMedida})`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
