import { useState, useEffect } from 'react'
import { Plus, Search, FileText, ChevronRight, XCircle, Trash2, Calendar } from 'lucide-react'
import { CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'

interface ComprasTabProps {
  proveedorId: string
  proveedorNombre: string
}

export function ComprasTab({ proveedorId, proveedorNombre }: ComprasTabProps) {
  const [compras, setCompras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCompra, setSelectedCompra] = useState<any | null>(null)

  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([])

  // Form state
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [numero, setNumero] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState<Array<{ productoId: string, cantidad: string, costoUnitario: string, nombre?: string }>>([])

  const fetchCompras = async () => {
    setLoading(true)
    try {
      const data = await (window as any).api.getComprasByProveedor(proveedorId)
      // client side filter for now
      let filtered = data || []
      if (search) {
        filtered = filtered.filter((c: any) => 
          (c.numero && c.numero.toLowerCase().includes(search.toLowerCase())) ||
          (c.observaciones && c.observaciones.toLowerCase().includes(search.toLowerCase()))
        )
      }
      if (filtroEstado !== 'todas') {
        filtered = filtered.filter((c: any) => c.estado === filtroEstado)
      }
      setCompras(filtered)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductos = async () => {
    try {
      const prods = await (window as any).api.getProductos()
      setProductosDisponibles(prods.filter((p: any) => p.activo))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCompras()
    fetchProductos()
  }, [proveedorId, search, filtroEstado])

  const openForm = () => {
    setFecha(new Date().toISOString().split('T')[0])
    setNumero('')
    setObservaciones('')
    setLineas([])
    setIsFormOpen(true)
  }

  const addLinea = () => {
    setLineas([...lineas, { productoId: '', cantidad: '1', costoUnitario: '0' }])
  }

  const updateLinea = (index: number, field: string, value: string) => {
    const newLineas = [...lineas]
    if (field === 'productoId') {
      const prod = productosDisponibles.find(p => p.id === value)
      newLineas[index] = { 
        ...newLineas[index], 
        productoId: value, 
        costoUnitario: prod?.costo?.toString() || '0',
        nombre: prod?.nombre 
      }
    } else {
      newLineas[index] = { ...newLineas[index], [field]: value }
    }
    setLineas(newLineas)
  }

  const removeLinea = (index: number) => {
    setLineas(lineas.filter((_, i) => i !== index))
  }

  const handleSaveCompra = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (lineas.length === 0) {
      alert('Debe agregar al menos un producto a la compra.')
      return
    }

    const detallesValidos = lineas.filter(l => l.productoId && parseFloat(l.cantidad) > 0 && parseFloat(l.costoUnitario) >= 0)
    if (detallesValidos.length !== lineas.length) {
      alert('Verifique que todas las líneas tengan un producto seleccionado, cantidad mayor a 0 y costo válido.')
      return
    }

    const data = {
      fecha: new Date(fecha),
      numero,
      observaciones,
      detalles: detallesValidos.map(l => ({
        productoId: l.productoId,
        cantidad: parseFloat(l.cantidad),
        costoUnitario: parseFloat(l.costoUnitario)
      }))
    }

    try {
      await (window as any).api.registrarCompra(proveedorId, data)
      setIsFormOpen(false)
      fetchCompras()
    } catch (error) {
      console.error('Error al guardar compra', error)
      alert('Error al guardar la compra')
    }
  }

  const handleAnular = async (id: string) => {
    if (!confirm('¿Está seguro de anular esta compra? Esto revertirá los movimientos de stock y el saldo en cuenta corriente. Esta acción no se puede deshacer.')) return
    
    try {
      await (window as any).api.anularCompra(id)
      setIsDetailOpen(false)
      fetchCompras()
    } catch (error: any) {
      console.error('Error al anular compra', error)
      alert(error.message || 'Error al anular la compra')
    }
  }

  const openDetail = (compra: any) => {
    setSelectedCompra(compra)
    setIsDetailOpen(true)
  }

  const totalCalculado = lineas.reduce((acc, l) => acc + ((parseFloat(l.cantidad) || 0) * (parseFloat(l.costoUnitario) || 0)), 0)

  // Render Estado de Pago
  const renderEstadoPago = (compra: any) => {
    if (compra.estado === 'anulada') return <Badge variant="outline" className="text-gray-500">Anulada</Badge>
    if (compra.saldoPendiente <= 0) return <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">Pagada</Badge>
    if (compra.importePagado > 0) return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">Pago parcial</Badge>
    return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">Pendiente</Badge>
  }

  const renderEstadoCompra = (estado: string) => {
    switch (estado) {
      case 'recibida': return <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">Recibida</Badge>
      case 'pendiente': return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">Pendiente</Badge>
      case 'anulada': return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-line-through">Anulada</Badge>
      default: return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-8">Cargando compras...</div>

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">Historial de Compras</h3>
          <p className="text-sm text-gray-400">Gestioná las compras y recepciones de mercadería.</p>
        </div>
        <Button onClick={openForm} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva compra
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Buscar por referencia u observación..." 
            className="pl-9 bg-gray-950 border-gray-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[180px] bg-gray-950 border-gray-800">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos los estados</SelectItem>
            <SelectItem value="recibida">Recibida</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {compras.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg bg-gray-950/50">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">No hay compras registradas</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-6">
            Todavía no existen compras registradas para este proveedor. Registrá tu primera operación para comenzar a llevar el historial.
          </p>
          <Button onClick={openForm} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Registrar primera compra
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-950">
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-400">Fecha</TableHead>
                <TableHead className="text-gray-400">Referencia</TableHead>
                <TableHead className="text-center text-gray-400">Artículos</TableHead>
                <TableHead className="text-center text-gray-400">Estado</TableHead>
                <TableHead className="text-center text-gray-400">Pago</TableHead>
                <TableHead className="text-right text-gray-400">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => (
                <TableRow 
                  key={compra.id} 
                  className={cn("border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors", compra.estado === 'anulada' && "opacity-60")}
                  onClick={() => openDetail(compra)}
                >
                  <TableCell className="text-gray-300 font-medium">
                    {new Date(compra.fecha).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-gray-400">{compra.numero || 'S/R'}</TableCell>
                  <TableCell className="text-center text-gray-400">
                    {compra.detalles?.reduce((acc: number, d: any) => acc + d.cantidad, 0) || 0} unid.
                  </TableCell>
                  <TableCell className="text-center">{renderEstadoCompra(compra.estado)}</TableCell>
                  <TableCell className="text-center">{renderEstadoPago(compra)}</TableCell>
                  <TableCell className={cn("text-right font-medium", compra.estado === 'anulada' ? "text-gray-500" : "text-white")}>
                    {formatCurrency(compra.total)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* MODAL NUEVA COMPRA */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[800px] bg-gray-950 border-gray-800 text-gray-200">
          <form onSubmit={handleSaveCompra}>
            <DialogHeader>
              <DialogTitle>Registrar Nueva Compra</DialogTitle>
              <CardDescription>Proveedor: {proveedorNombre}</CardDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Compra</Label>
                  <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className="bg-gray-900 border-gray-800" />
                </div>
                <div className="space-y-2">
                  <Label>Número / Referencia</Label>
                  <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ej: FC-0001-00001234" className="bg-gray-900 border-gray-800" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Detalle de Productos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLinea} className="border-gray-700 hover:bg-gray-800">
                    <Plus className="w-4 h-4 mr-2" /> Agregar línea
                  </Button>
                </div>
                
                {lineas.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-800 rounded-md">
                    <p className="text-gray-500 text-sm">Haga clic en Agregar línea para comenzar</p>
                  </div>
                ) : (
                  <div className="border border-gray-800 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-900">
                        <TableRow className="border-gray-800">
                          <TableHead>Producto</TableHead>
                          <TableHead className="w-[100px]">Cantidad</TableHead>
                          <TableHead className="w-[120px]">Costo Unit.</TableHead>
                          <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineas.map((linea, idx) => (
                          <TableRow key={idx} className="border-gray-800">
                            <TableCell className="p-2">
                              <Select value={linea.productoId} onValueChange={(val) => updateLinea(idx, 'productoId', val)}>
                                <SelectTrigger className="bg-gray-950 border-gray-800">
                                  <SelectValue placeholder="Seleccionar producto..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {productosDisponibles.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.nombre} {p.codigoBarras ? `(${p.codigoBarras})` : ''} - {formatCurrency(p.costo)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Input type="number" min="0.01" step="any" value={linea.cantidad} onChange={e => updateLinea(idx, 'cantidad', e.target.value)} required className="bg-gray-950 border-gray-800 px-2" />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input type="number" min="0" step="any" value={linea.costoUnitario} onChange={e => updateLinea(idx, 'costoUnitario', e.target.value)} required className="bg-gray-950 border-gray-800 px-2" />
                            </TableCell>
                            <TableCell className="p-2 text-right font-medium text-gray-300">
                              {formatCurrency((parseFloat(linea.cantidad) || 0) * (parseFloat(linea.costoUnitario) || 0))}
                            </TableCell>
                            <TableCell className="p-2">
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLinea(idx)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-between items-center bg-gray-900 p-4 rounded-md border border-gray-800">
                  <span className="text-gray-400">Total de la operación</span>
                  <span className="text-2xl font-bold text-white">{formatCurrency(totalCalculado)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Input value={observaciones} onChange={e => setObservaciones(e.target.value)} className="bg-gray-900 border-gray-800" placeholder="Notas internas sobre esta compra..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-gray-700 hover:bg-gray-800 text-white">Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Confirmar Compra</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLE DE COMPRA */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] bg-gray-950 border-gray-800 text-gray-200">
          {selectedCompra && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl">Detalle de Compra</DialogTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4"/> {new Date(selectedCompra.fecha).toLocaleDateString()}
                      {selectedCompra.numero && <span className="ml-2">| Ref: {selectedCompra.numero}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderEstadoPago(selectedCompra)}
                    {renderEstadoCompra(selectedCompra.estado)}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="rounded-md border border-gray-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-900">
                      <TableRow className="border-gray-800">
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCompra.detalles?.map((d: any) => (
                        <TableRow key={d.id} className="border-gray-800">
                          <TableCell className="text-gray-300 font-medium">{d.producto?.nombre || 'Producto eliminado'}</TableCell>
                          <TableCell className="text-center text-gray-400">{d.cantidad}</TableCell>
                          <TableCell className="text-right text-gray-400">{formatCurrency(d.costoUnitario)}</TableCell>
                          <TableCell className="text-right text-white font-medium">{formatCurrency(d.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-start">
                  <div className="max-w-md">
                    {selectedCompra.observaciones && (
                      <div className="text-sm">
                        <span className="text-gray-500 block mb-1">Observaciones:</span>
                        <p className="text-gray-300">{selectedCompra.observaciones}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right bg-gray-900 p-4 rounded-md border border-gray-800 min-w-[200px]">
                    <span className="text-gray-500 text-sm block mb-1">Total de la compra</span>
                    <span className="text-2xl font-bold text-white">{formatCurrency(selectedCompra.total)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between items-center border-t border-gray-800 pt-4">
                <div>
                  {selectedCompra.estado !== 'anulada' && (
                    <Button type="button" variant="ghost" onClick={() => handleAnular(selectedCompra.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <XCircle className="w-4 h-4 mr-2" /> Anular Compra
                    </Button>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)} className="border-gray-700 hover:bg-gray-800 text-white">
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
