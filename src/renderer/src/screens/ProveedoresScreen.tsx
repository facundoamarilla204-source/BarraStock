import { useState, useEffect } from 'react'
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, cn } from '@/lib/utils'
import { ComprasTab } from './proveedores/ComprasTab'
import { CuentaCorrienteTab } from './proveedores/CuentaCorrienteTab'
import { ProductosTab } from './proveedores/ProductosTab'

export function ProveedoresScreen() {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activo')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<any | null>(null)
  const [selectedProveedor, setSelectedProveedor] = useState<any | null>(null)
  
  // Pestaña activa en el detalle (Resumen, Compras, Cuenta corriente, Pagos, Productos)
  const [activeTab, setActiveTab] = useState('resumen')

  const fetchProveedores = async () => {
    setLoading(true)
    try {
      const data = await (window as any).api.getProveedores({
        search,
        estado: filtroEstado,
        tipo: filtroTipo
      })
      setProveedores(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProveedores()
  }, [search, filtroEstado, filtroTipo])

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const data = {
      razonSocial: formData.get('razonSocial') as string,
      cuit: formData.get('cuit') as string,
      contacto: formData.get('contacto') as string,
      telefono: formData.get('telefono') as string,
      whatsapp: formData.get('whatsapp') as string,
      email: formData.get('email') as string,
      direccion: formData.get('direccion') as string,
      localidad: formData.get('localidad') as string,
      tipo: formData.get('tipo') as string,
      condicionPago: formData.get('condicionPago') as string,
      diasVencimiento: parseInt(formData.get('diasVencimiento') as string) || 0,
      limiteCredito: parseFloat(formData.get('limiteCredito') as string) || 0,
      notas: formData.get('notas') as string,
    }

    try {
      if (editingProveedor) {
        await (window as any).api.updateProveedor(editingProveedor.id, data)
      } else {
        await (window as any).api.createProveedor(data)
      }
      setIsFormOpen(false)
      fetchProveedores()
      if (isDetailOpen && selectedProveedor?.id === editingProveedor?.id) {
         fetchDetalleProveedor(selectedProveedor.id)
      }
    } catch (error) {
      console.error('Error al guardar proveedor:', error)
      alert('Error al guardar el proveedor')
    }
  }

  const toggleActivo = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('¿Cambiar estado del proveedor?')) return
    await (window as any).api.toggleProveedorActivo(id)
    fetchProveedores()
    if (isDetailOpen && selectedProveedor?.id === id) {
       fetchDetalleProveedor(id)
    }
  }

  const fetchDetalleProveedor = async (id: string) => {
    try {
      const data = await (window as any).api.getProveedorById(id)
      setSelectedProveedor(data)
    } catch (e) {
      console.error(e)
    }
  }

  const openDetail = (p: any) => {
    setSelectedProveedor(p)
    setIsDetailOpen(true)
    fetchDetalleProveedor(p.id)
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const importe = parseFloat(formData.get('importe') as string)
    if (!importe || importe <= 0) return alert('El importe debe ser mayor a 0')

    const data = {
      importe,
      medioPago: formData.get('medioPago') as string,
      referencia: formData.get('referencia') as string,
      observaciones: formData.get('observaciones') as string,
    }

    try {
      await (window as any).api.registrarPagoProveedor(selectedProveedor.id, data)
      form.reset()
      fetchDetalleProveedor(selectedProveedor.id)
      fetchProveedores()
      alert('Pago registrado correctamente')
    } catch (error) {
      console.error('Error registrando pago:', error)
      alert('Hubo un error al registrar el pago')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            Proveedores
          </h2>
          <p className="text-gray-400">
            Gestioná los proveedores, compras, cuentas corrientes y pagos del negocio.
          </p>
        </div>
        <Button onClick={() => { setEditingProveedor(null); setIsFormOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo proveedor
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nombre, CUIT, contacto..."
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
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[180px] bg-gray-950 border-gray-800">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los tipos</SelectItem>
                <SelectItem value="Bebidas">Bebidas</SelectItem>
                <SelectItem value="Alimentos">Alimentos</SelectItem>
                <SelectItem value="Insumos">Insumos</SelectItem>
                <SelectItem value="Packaging">Packaging</SelectItem>
                <SelectItem value="Limpieza">Limpieza</SelectItem>
                <SelectItem value="Equipamiento">Equipamiento</SelectItem>
                <SelectItem value="Servicios">Servicios</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-gray-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-950">
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Proveedor</TableHead>
                  <TableHead className="text-gray-400">Contacto</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-right text-gray-400">Saldo Pendiente</TableHead>
                  <TableHead className="text-center text-gray-400">Estado</TableHead>
                  <TableHead className="text-right text-gray-400">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">Cargando proveedores...</TableCell>
                  </TableRow>
                ) : proveedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">No se encontraron proveedores</TableCell>
                  </TableRow>
                ) : (
                  proveedores.map((p) => (
                    <TableRow 
                      key={p.id} 
                      className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => openDetail(p)}
                    >
                      <TableCell>
                        <div className="font-medium text-gray-200">{p.razonSocial}</div>
                        {p.cuit && <div className="text-xs text-gray-500">CUIT: {p.cuit}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-300">{p.contacto || '-'}</div>
                        <div className="text-xs text-gray-500">{p.telefono || p.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-800 border-gray-700 text-gray-300">{p.tipo || 'Sin tipo'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={p.saldoPendiente > 0 ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                          {p.saldoPendiente > 0 ? formatCurrency(p.saldoPendiente) : '$ 0.00'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.activo ? "default" : "destructive"} className={p.activo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingProveedor(p)
                            setIsFormOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={p.activo ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}
                          onClick={(e) => toggleActivo(p.id, e)}
                        >
                          {p.activo ? 'Desactivar' : 'Reactivar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL FORMULARIO DE PROVEEDOR */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdate} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razonSocial">Razón Social / Nombre *</Label>
                <Input id="razonSocial" name="razonSocial" defaultValue={editingProveedor?.razonSocial} required className="bg-gray-950 border-gray-800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT / DNI</Label>
                <Input id="cuit" name="cuit" defaultValue={editingProveedor?.cuit} className="bg-gray-950 border-gray-800" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contacto">Persona de contacto</Label>
                <Input id="contacto" name="contacto" defaultValue={editingProveedor?.contacto} className="bg-gray-950 border-gray-800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de proveedor</Label>
                <Select name="tipo" defaultValue={editingProveedor?.tipo || "Otros"}>
                  <SelectTrigger className="bg-gray-950 border-gray-800">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bebidas">Bebidas</SelectItem>
                    <SelectItem value="Alimentos">Alimentos</SelectItem>
                    <SelectItem value="Insumos">Insumos</SelectItem>
                    <SelectItem value="Packaging">Packaging</SelectItem>
                    <SelectItem value="Limpieza">Limpieza</SelectItem>
                    <SelectItem value="Equipamiento">Equipamiento</SelectItem>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" name="telefono" defaultValue={editingProveedor?.telefono} className="bg-gray-950 border-gray-800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={editingProveedor?.whatsapp} className="bg-gray-950 border-gray-800" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" name="email" type="email" defaultValue={editingProveedor?.email} className="bg-gray-950 border-gray-800" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" name="direccion" defaultValue={editingProveedor?.direccion} className="bg-gray-950 border-gray-800" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="condicionPago">Condiciones de pago</Label>
                <Select name="condicionPago" defaultValue={editingProveedor?.condicionPago || "Contado"}>
                  <SelectTrigger className="bg-gray-950 border-gray-800">
                    <SelectValue placeholder="Condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diasVencimiento">Días de vencimiento</Label>
                <Input id="diasVencimiento" name="diasVencimiento" type="number" min="0" defaultValue={editingProveedor?.diasVencimiento || 0} className="bg-gray-950 border-gray-800" />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notas">Notas / Observaciones</Label>
                <Input id="notas" name="notas" defaultValue={editingProveedor?.notas} className="bg-gray-950 border-gray-800" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-gray-700 hover:bg-gray-800">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Guardar Proveedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLE DE PROVEEDOR */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-4xl h-[85vh] flex flex-col p-0">
          {selectedProveedor && (
            <>
              {/* Header Detalle */}
              <div className="border-b border-gray-800 p-6 shrink-0 flex items-start justify-between bg-gray-950/50 rounded-t-lg">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-900/50 border border-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-400 shrink-0">
                    {selectedProveedor.razonSocial.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      {selectedProveedor.razonSocial}
                      <Badge variant={selectedProveedor.activo ? "default" : "destructive"} className={selectedProveedor.activo ? "bg-green-500/10 text-green-500" : ""}>
                        {selectedProveedor.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </h2>
                    <div className="text-gray-400 text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {selectedProveedor.cuit && <span>CUIT: {selectedProveedor.cuit}</span>}
                      {selectedProveedor.tipo && <span>Tipo: {selectedProveedor.tipo}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Saldo Pendiente</div>
                  <div className={cn("text-2xl font-bold", selectedProveedor.saldoPendiente > 0 ? "text-red-400" : "text-green-400")}>
                    {formatCurrency(selectedProveedor.saldoPendiente)}
                  </div>
                </div>
              </div>

              {/* Tabs navegacion */}
              <div className="flex border-b border-gray-800 shrink-0 px-4">
                {['resumen', 'compras', 'cuenta corriente', 'pagos', 'productos'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
                      activeTab === tab 
                        ? "border-blue-500 text-blue-400" 
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Contenido de la tab */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {activeTab === 'resumen' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-gray-950 border-gray-800">
                        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-400">Información de Contacto</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {selectedProveedor.contacto && <div className="flex items-center gap-3"><UserIcon /> {selectedProveedor.contacto}</div>}
                          {selectedProveedor.telefono && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-500"/> {selectedProveedor.telefono}</div>}
                          {selectedProveedor.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-500"/> {selectedProveedor.email}</div>}
                          {selectedProveedor.direccion && <div className="flex items-center gap-3"><MapPinIcon /> {selectedProveedor.direccion} {selectedProveedor.localidad}</div>}
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-950 border-gray-800">
                        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-400">Condiciones Comerciales</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between border-b border-gray-800 pb-2">
                            <span className="text-gray-500">Condición de pago</span>
                            <span className="text-gray-200 font-medium">{selectedProveedor.condicionPago || 'No definida'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-800 pb-2">
                            <span className="text-gray-500">Plazo</span>
                            <span className="text-gray-200 font-medium">{selectedProveedor.diasVencimiento ? `${selectedProveedor.diasVencimiento} días` : 'Al contado'}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-800 pb-2">
                            <span className="text-gray-500">Límite de crédito</span>
                            <span className="text-gray-200 font-medium">{selectedProveedor.limiteCredito ? formatCurrency(selectedProveedor.limiteCredito) : 'Sin límite definido'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedProveedor.notas && (
                      <Card className="bg-gray-950 border-gray-800">
                        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-400">Notas y Observaciones</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-gray-300 text-sm whitespace-pre-line">{selectedProveedor.notas}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {activeTab === 'compras' && (
                  <ComprasTab proveedorId={selectedProveedor.id} proveedorNombre={selectedProveedor.razonSocial} />
                )}

                {activeTab === 'cuenta corriente' && (
                  <CuentaCorrienteTab proveedorId={selectedProveedor.id} />
                )}

                {activeTab === 'pagos' && (
                  <div className="space-y-6">
                    <Card className="bg-gray-950 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg">Registrar Pago a Proveedor</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleRegistrarPago} className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="space-y-2 flex-1">
                            <Label>Importe</Label>
                            <Input name="importe" type="number" step="0.01" min="0.01" required className="bg-gray-900 border-gray-800" />
                          </div>
                          <div className="space-y-2 flex-1">
                            <Label>Medio de Pago</Label>
                            <Select name="medioPago" defaultValue="Transferencia">
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Transferencia">Transferencia</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 flex-1">
                            <Label>Referencia / Comprobante</Label>
                            <Input name="referencia" className="bg-gray-900 border-gray-800" />
                          </div>
                          <Button type="submit" className="bg-green-600 hover:bg-green-700">Registrar Pago</Button>
                        </form>
                      </CardContent>
                    </Card>

                    <div>
                      <h3 className="text-lg font-medium mb-4">Últimos Pagos Registrados</h3>
                      {selectedProveedor.pagos && selectedProveedor.pagos.length > 0 ? (
                        <div className="rounded-md border border-gray-800 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-950">
                              <TableRow className="border-gray-800">
                                <TableHead className="text-gray-400">Fecha</TableHead>
                                <TableHead className="text-gray-400">Medio de Pago</TableHead>
                                <TableHead className="text-gray-400">Referencia</TableHead>
                                <TableHead className="text-right text-gray-400">Importe</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedProveedor.pagos.map((pago: any) => (
                                <TableRow key={pago.id} className="border-gray-800">
                                  <TableCell className="text-gray-300">{new Date(pago.fecha).toLocaleString()}</TableCell>
                                  <TableCell className="text-gray-300">{pago.medioPago}</TableCell>
                                  <TableCell className="text-gray-400">{pago.referencia || '-'}</TableCell>
                                  <TableCell className="text-right text-green-400 font-medium">{formatCurrency(pago.importe)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No hay pagos registrados para este proveedor.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'productos' && (
                  <ProductosTab 
                    proveedorId={selectedProveedor.id} 
                    onNavigateToCompras={() => setActiveTab('compras')}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Iconos helper para evitar más imports
const UserIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user h-4 w-4 text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const MapPinIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin h-4 w-4 text-gray-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>

