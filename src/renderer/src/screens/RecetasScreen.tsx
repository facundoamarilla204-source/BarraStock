import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function RecetasScreen() {
  const [recetas, setRecetas] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Opciones para buscar — ahora solo productos
  const [disponibles, setDisponibles] = useState<{ id: string; nombre: string; unidadMedida: string }[]>([])
  const [busquedaComponente, setBusquedaComponente] = useState('')

  // Form
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('trago')
  const [precio, setPrecio] = useState(0)
  const [items, setItems] = useState<any[]>([])
  const [ivaInfo, setIvaInfo] = useState({ activo: false, porcentaje: 21 })

  const loadData = async () => {
    const config = await (window as any).api.getConfiguracion()
    setIvaInfo({ activo: config?.ivaActivo ?? false, porcentaje: config?.ivaPorcentaje ?? 21 })
    const data = await (window as any).api.getRecetas()
    setRecetas(data)
  }

  const loadDisponibles = async () => {
    const prod = await (window as any).api.getProductos()
    setDisponibles(
      prod.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        unidadMedida: p.unidadMedida || 'unidad',
        tamanioEnvase: p.tamanioEnvase || null
      }))
    )
  }

  useEffect(() => {
    loadData()
    loadDisponibles()
  }, [])

  const filtered = recetas.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const itemsPayload = items.map(it => ({
      productoId: it.id,
      cantidad: it.cantidad,
      unidad: it.unidadMedida
    }))

    const payload = {
      nombre,
      categoria,
      precio,
      items: itemsPayload
    }

    try {
      if (editingId) {
        await (window as any).api.updateReceta(editingId, payload)
      } else {
        await (window as any).api.createReceta(payload)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Error al guardar receta')
    }
  }

  const openNewModal = () => {
    setEditingId(null)
    setNombre('')
    setCategoria('trago')
    setPrecio(0)
    setItems([])
    setIsModalOpen(true)
  }

  const openEditModal = (receta: any) => {
    setEditingId(receta.id)
    setNombre(receta.nombre)
    setCategoria(receta.categoria)
    setPrecio(receta.precio)
    setItems(receta.items.map((it: any) => ({
      id: it.producto.id,
      nombre: it.producto.nombre,
      cantidad: it.cantidad,
      unidadMedida: it.unidad,
      tamanioEnvase: it.producto.tamanioEnvase
    })))
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de borrar esta receta?')) {
      await (window as any).api.deleteReceta(id)
      loadData()
    }
  }

  const agregarItem = (item: any) => {
    setItems([...items, { ...item, cantidad: 1 }])
    setBusquedaComponente('')
  }

  const actualizarCantidad = (index: number, cantidad: number) => {
    const nuevos = [...items]
    nuevos[index].cantidad = cantidad
    setItems(nuevos)
  }

  const removerItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recetas y Combos</h2>
        <Button onClick={openNewModal}>Nueva Receta</Button>
      </div>

      <Input
        placeholder="Buscar receta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-md max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Componentes</TableHead>
              <TableHead>Precio de Venta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nombre}</TableCell>
                <TableCell>{item.categoria}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.items.map((it: any) => (
                      <Badge key={it.id} variant="secondary" className="font-normal text-xs text-gray-300 bg-gray-800 hover:bg-gray-700">
                        {it.cantidad} {it.unidad} {it.producto?.nombre}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>${item.precio.toFixed(2)}</TableCell>
                <TableCell className="text-right space-x-2 min-w-[150px]">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(item)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>Borrar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Receta / Combo' : 'Nueva Receta / Combo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input required value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="trago">Trago</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Precio de Venta</Label>
                <Input type="number" step="0.01" required value={precio} onChange={e => setPrecio(parseFloat(e.target.value))} />
                {ivaInfo.activo && (
                  <p className="text-xs text-blue-400 mt-1">
                    Precio sin IVA. Se sumará automáticamente un {ivaInfo.porcentaje}% al vender.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Componentes de la Receta</Label>
              <div className="border rounded-md p-4 space-y-4 bg-gray-900/50">
                <div className="space-y-2">
                  <Input 
                    placeholder="Buscar producto para agregar..." 
                    value={busquedaComponente}
                    onChange={e => setBusquedaComponente(e.target.value)}
                  />
                  {busquedaComponente.length > 1 && (
                    <div className="border rounded-md bg-gray-800 p-2 space-y-1 max-h-40 overflow-y-auto">
                      {disponibles
                        .filter(d => d.nombre.toLowerCase().includes(busquedaComponente.toLowerCase()))
                        .map(d => (
                          <div 
                            key={d.id} 
                            className="flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer rounded"
                            onClick={() => agregarItem(d)}
                          >
                            <span>{d.nombre}</span>
                            <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">{d.unidadMedida}</span>
                          </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-gray-800 p-2 rounded">
                      <div className="flex-1 font-medium">{it.nombre}</div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => actualizarCantidad(idx, it.tamanioEnvase || 1)}
                        title="Usar 100% del envase"
                        className="text-xs px-2 h-8"
                      >
                        100% Envase
                      </Button>
                      <div className="w-24">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={it.cantidad} 
                          onChange={e => actualizarCantidad(idx, parseFloat(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div className="w-16 text-sm text-gray-400">{it.unidadMedida}</div>
                      <Button variant="ghost" size="sm" type="button" onClick={() => removerItem(idx)}>X</Button>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Agrega componentes buscando arriba</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={items.length === 0}>Guardar Receta</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
