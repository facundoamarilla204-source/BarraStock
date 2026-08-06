import { useState, useEffect } from 'react'
import { PackageOpen, XCircle, DollarSign, Activity } from 'lucide-react'

export function CajaScreen() {
  const [caja, setCaja] = useState<any>(null)
  const [ultimaCaja, setUltimaCaja] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fondoInicial, setFondoInicial] = useState<string>('0')
  const [error, setError] = useState<string | null>(null)

  const loadCaja = async () => {
    try {
      setLoading(true)
      const api = (window as any).api
      const data = await api.getCajaAbierta()
      setCaja(data)
      
      if (!data) {
        const ultima = await api.getUltimaCajaCerrada()
        setUltimaCaja(ultima)
      } else {
        setUltimaCaja(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCaja()
  }, [])

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const fondo = parseFloat(fondoInicial)
    if (isNaN(fondo) || fondo < 0) {
      setError('El fondo inicial debe ser un número válido mayor o igual a 0.')
      return
    }

    try {
      const result = await (window as any).api.abrirCaja(fondo)
      if (result.success) {
        await loadCaja()
      } else {
        setError(result.message)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCerrar = async () => {
    if (!confirm('¿Estás seguro de que quieres cerrar la caja actual?')) return

    setError(null)
    try {
      const result = await (window as any).api.cerrarCaja()
      if (result.success) {
        await loadCaja()
      } else {
        setError(result.message)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleReabrir = async () => {
    if (!ultimaCaja) return
    const confirmMessage = `¿Estás seguro de reabrir la Caja #${ultimaCaja.numero}, cerrada a las ${new Date(ultimaCaja.fechaCierre).toLocaleTimeString()}? Podrás seguir registrando ventas en esta sesión.`
    if (!confirm(confirmMessage)) return

    setError(null)
    try {
      const api = (window as any).api
      const result = await api.reabrirCaja(ultimaCaja.id)
      if (result.success) {
        await loadCaja()
      } else {
        setError(result.message)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="text-gray-400 p-6">Cargando...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Caja Actual</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md">
          {error}
        </div>
      )}

      {!caja ? (
        <div className="space-y-6 max-w-md mx-auto mt-12">
          {/* Nueva Caja */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex flex-col items-center justify-center space-y-4 mb-8">
              <PackageOpen className="w-16 h-16 text-gray-700" />
              <h3 className="text-xl font-medium text-gray-300">No hay caja abierta</h3>
              <p className="text-sm text-gray-500 text-center">
                Debes abrir una caja para poder empezar a registrar ventas en el POS.
              </p>
            </div>

            <form onSubmit={handleAbrir} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Fondo Inicial ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full bg-gray-950 border border-gray-800 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500"
                  value={fondoInicial}
                  onChange={(e) => setFondoInicial(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition-colors"
              >
                Abrir Caja
              </button>
            </form>
          </div>

          {/* Reabrir última caja */}
          {ultimaCaja && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-300 mb-2">Reabrir última caja</h3>
              <p className="text-sm text-gray-500 mb-4">
                Si cerraste la caja por error, puedes reabrir la última sesión cerrada.
              </p>
              <div className="bg-gray-950 p-4 rounded-md mb-4 text-sm text-gray-400 space-y-1">
                <p><span className="font-medium text-gray-300">Caja #{ultimaCaja.numero}</span></p>
                <p>Cierre: {new Date(ultimaCaja.fechaCierre).toLocaleString()}</p>
                <p>Total Esperado en Caja: ${ultimaCaja.totalEsperadoCaja?.toFixed(2)}</p>
              </div>
              <button
                onClick={handleReabrir}
                className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-500 border border-orange-500/30 font-medium py-2 rounded-md transition-colors"
              >
                Reabrir Caja #{ultimaCaja.numero}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Caja #{caja.numero} - ABIERTA
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Abierta el {new Date(caja.fechaApertura).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleCerrar}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Cerrar Caja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1">Fondo Inicial</p>
              <p className="text-2xl font-bold">${caja.fondoInicial.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Ventas Efectivo
              </p>
              <p className="text-2xl font-bold text-green-400">${caja.totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Ventas Transferencia
              </p>
              <p className="text-2xl font-bold text-blue-400">${caja.totalTransferencia.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1">Total Ventas</p>
              <p className="text-2xl font-bold">${caja.totalVentas.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1">Cantidad Ventas Activas</p>
              <p className="text-2xl font-bold">{caja.cantidadVentas}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <p className="text-sm font-medium text-gray-400 mb-1">Cantidad Anuladas</p>
              <p className="text-2xl font-bold">{caja.cantidadAnuladas}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 border-l-4 border-l-green-500">
              <p className="text-sm font-medium text-gray-400 mb-1">Total Esperado en Caja (Efectivo)</p>
              <p className="text-3xl font-bold text-green-400">${caja.totalEsperadoCaja.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Fondo Inicial + Ventas Efectivo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
