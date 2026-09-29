import { useState, useEffect, useMemo } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Search, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'

interface CuentaCorrienteTabProps {
  proveedorId: string
}

export function CuentaCorrienteTab({ proveedorId }: CuentaCorrienteTabProps) {
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const fetchMovimientos = async () => {
    setLoading(true)
    try {
      const data = await (window as any).api.getProveedoresMovimientos(proveedorId)
      setMovimientos(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovimientos()
  }, [proveedorId])

  // Filter logic
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      // Búsqueda
      if (search) {
        const searchLower = search.toLowerCase()
        const matchDesc = m.descripcion?.toLowerCase().includes(searchLower)
        const matchCompra = m.compra?.numero?.toLowerCase().includes(searchLower)
        const matchPago = m.pago?.referencia?.toLowerCase().includes(searchLower)
        if (!matchDesc && !matchCompra && !matchPago) return false
      }

      // Filtro por tipo
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'compras' && m.tipo !== 'COMPRA') return false
        if (filtroTipo === 'pagos' && m.tipo !== 'PAGO') return false
        if (filtroTipo === 'ajustes' && m.tipo !== 'AJUSTE') return false
      }

      // Filtro por periodo (simplificado para el ejemplo)
      if (filtroPeriodo !== 'todos') {
        const date = new Date(m.fecha)
        const now = new Date()
        if (filtroPeriodo === 'hoy') {
          if (date.toDateString() !== now.toDateString()) return false
        } else if (filtroPeriodo === '7dias') {
          const diffTime = Math.abs(now.getTime() - date.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > 7) return false
        } else if (filtroPeriodo === 'mes') {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false
        }
      }

      return true
    })
  }, [movimientos, search, filtroPeriodo, filtroTipo])

  // Cálculos del resumen
  const saldoActual = movimientos.length > 0 ? movimientos[0].saldoResultante : 0
  const totalCompras = movimientos.filter(m => m.tipo === 'COMPRA').reduce((acc, m) => acc + m.monto, 0)
  const totalPagado = movimientos.filter(m => m.tipo === 'PAGO').reduce((acc, m) => acc + Math.abs(m.monto), 0)

  // Vencimientos
  const comprasPendientes = movimientos
    .filter(m => m.tipo === 'COMPRA' && m.compra && m.compra.saldoPendiente > 0)
    .map(m => m.compra)

  let proximoVencimiento: Date | null = null as Date | null
  let deudaVencida = 0
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  comprasPendientes.forEach(c => {
    if (c.fechaVencimiento) {
      const vDate = new Date(c.fechaVencimiento)
      if (vDate < today) {
        deudaVencida += c.saldoPendiente
      } else {
        if (!proximoVencimiento || vDate < proximoVencimiento) {
          proximoVencimiento = vDate
        }
      }
    }
  })

  if (loading) return <div className="text-gray-500 text-center py-8">Cargando cuenta corriente...</div>

  const renderBadgeVencimiento = (fechaVenc: string) => {
    if (!fechaVenc) return null
    const vDate = new Date(fechaVenc)
    vDate.setHours(0, 0, 0, 0)
    const diffTime = vDate.getTime() - today.getTime()
    const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diff < 0) {
      return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 ml-2">Vencido</Badge>
    } else if (diff <= 3) {
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10 ml-2">Vence en {diff} {diff === 1 ? 'día' : 'días'}</Badge>
    }
    return <span className="text-gray-500 text-xs ml-2">Vence: {vDate.toLocaleDateString()}</span>
  }

  return (
    <div className="space-y-6">
      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Saldo Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", saldoActual > 0 ? "text-red-400" : "text-white")}>
              {formatCurrency(saldoActual)}
            </div>
            {saldoActual === 0 && movimientos.length > 0 && (
              <p className="text-xs text-green-400 mt-1">Cuenta al día</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Deuda Vencida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", deudaVencida > 0 ? "text-red-400" : "text-gray-300")}>
              {formatCurrency(deudaVencida)}
            </div>
            {proximoVencimiento && deudaVencida === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Próximo vto: {proximoVencimiento.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Histórico Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalCompras)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Histórico Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalPagado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {movimientos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg bg-gray-950/50">
          <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">Cuenta corriente sin movimientos</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-6">
            Cuando registres compras o pagos a este proveedor, el historial de la cuenta corriente y su saldo aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-medium text-white">Libro de Movimientos</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-300"
                onClick={() => alert("El módulo de Pagos se implementará en la próxima etapa.")}
              >
                Registrar Pago
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="Buscar movimiento..." 
                  className="pl-9 bg-gray-950 border-gray-800"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="w-[140px] bg-gray-950 border-gray-800">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo el historial</SelectItem>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="7dias">Últimos 7 días</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[140px] bg-gray-950 border-gray-800">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="compras">Solo Compras</SelectItem>
                  <SelectItem value="pagos">Solo Pagos</SelectItem>
                  <SelectItem value="ajustes">Anulaciones/Ajustes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-gray-800 overflow-hidden bg-gray-950/30">
            <Table>
              <TableHeader className="bg-gray-900">
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400 w-32">Fecha</TableHead>
                  <TableHead className="text-gray-400">Descripción / Operación</TableHead>
                  <TableHead className="text-right text-gray-400">Débito (+)</TableHead>
                  <TableHead className="text-right text-gray-400">Crédito (-)</TableHead>
                  <TableHead className="text-right text-gray-400 font-semibold text-white">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosFiltrados.map((m) => (
                  <TableRow key={m.id} className="border-gray-800 hover:bg-gray-900/50">
                    <TableCell className="text-gray-300 text-sm">
                      {new Date(m.fecha).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.tipo === 'COMPRA' && <ArrowUpRight className="w-4 h-4 text-red-400" />}
                        {m.tipo === 'PAGO' && <ArrowDownRight className="w-4 h-4 text-green-400" />}
                        {m.tipo === 'AJUSTE' && <RefreshCw className="w-4 h-4 text-yellow-400" />}
                        
                        <div>
                          <p className="text-gray-200 font-medium">
                            {m.descripcion}
                          </p>
                          {m.tipo === 'COMPRA' && m.compra && (
                            <div className="flex items-center mt-1">
                              <Badge variant="outline" className={
                                m.compra.saldoPendiente <= 0 
                                  ? "border-green-500/30 text-green-400 bg-green-500/10" 
                                  : m.compra.importePagado > 0 
                                    ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" 
                                    : "border-gray-700 text-gray-400"
                              }>
                                {m.compra.saldoPendiente <= 0 ? 'Pagada' : m.compra.importePagado > 0 ? 'Pago parcial' : 'Pdte. de pago'}
                              </Badge>
                              {m.compra.saldoPendiente > 0 && renderBadgeVencimiento(m.compra.fechaVencimiento)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-red-400 font-medium">
                      {m.monto > 0 ? formatCurrency(m.monto) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-400 font-medium">
                      {m.monto < 0 ? formatCurrency(Math.abs(m.monto)) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-white">
                      {formatCurrency(m.saldoResultante)}
                    </TableCell>
                  </TableRow>
                ))}
                {movimientosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No se encontraron movimientos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
