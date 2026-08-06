import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CategoryAutocomplete } from '@/components/ui/category-autocomplete'

const UNIDADES = ['ml', 'gr', 'unidad'] as const

function formatStock(producto: any): string {
  if (producto.unidadMedida === 'unidad') {
    return `${producto.stock} unidades`
  }
  const envase = producto.tamanioEnvase
  if (envase && envase > 0) {
    const envases = Math.floor(producto.stock / envase)
    const resto = producto.stock % envase
    const restoStr = resto > 0 ? ` + ${resto} ${producto.unidadMedida}` : ''
    return `${envases} envase(s)${restoStr} (${producto.stock.toLocaleString()} ${producto.unidadMedida})`
  }
  return `${producto.stock.toLocaleString()} ${producto.unidadMedida}`
}

export function ProductosScreen() {
  const [productos, setProductos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    precio: 0,
    costo: 0,
    categoria: '',
    unidadMedida: 'unidad' as string,
    tamanioEnvase: 0,
    cantidadEnvases: 0,
    stock: 0,
    vendiblePorUnidad: true
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadData = async () => {
    const data = await (window as any).api.getProductos()
    setProductos(data)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      nombre: formData.nombre,
      precio: formData.precio,
      costo: formData.costo,
      categoria: formData.categoria || undefined,
      unidadMedida: formData.unidadMedida,
      vendiblePorUnidad: formData.vendiblePorUnidad,
      tamanioEnvase: formData.unidadMedida !== 'unidad' ? (formData.tamanioEnvase || null) : null
    }

    if (formData.unidadMedida !== 'unidad' && formData.tamanioEnvase > 0) {
      payload.cantidadEnvases = formData.cantidadEnvases
    } else {
      payload.stock = formData.stock
    }

    if (formData.id) {
      await (window as any).api.updateProducto(formData.id, payload)
    } else {
      await (window as any).api.createProducto(payload)
    }
    setIsModalOpen(false)
    loadData()
  }

  const handleEdit = (item: any) => {
    const envases =
      item.tamanioEnvase && item.tamanioEnvase > 0
        ? Math.floor(item.stock / item.tamanioEnvase)
        : 0
    setFormData({
      id: item.id,
      nombre: item.nombre,
      precio: item.precio,
      costo: item.costo,
      categoria: item.categoria || '',
      unidadMedida: item.unidadMedida || 'unidad',
      tamanioEnvase: item.tamanioEnvase || 0,
      cantidadEnvases: envases,
      stock: item.stock,
      vendiblePorUnidad: item.vendiblePorUnidad ?? true
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await (window as any).api.deleteProducto(id)
    setDeleteConfirmId(null)
    loadData()
  }

  const handleNew = () => {
    setFormData({
      id: '',
      nombre: '',
      precio: 0,
      costo: 0,
      categoria: '',
      unidadMedida: 'unidad',
      tamanioEnvase: 0,
      cantidadEnvases: 0,
      stock: 0,
      vendiblePorUnidad: true
    })
    setIsModalOpen(true)
  }

  const isLiquido = formData.unidadMedida === 'ml' || formData.unidadMedida === 'gr'
  const stockCalculado =
    isLiquido && formData.tamanioEnvase > 0
      ? formData.cantidadEnvases * formData.tamanioEnvase
      : formData.stock

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Productos e Insumos</h2>
        <Button onClick={handleNew}>Nuevo Producto</Button>
      </div>

      <Input
        placeholder="Buscar..."
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
              <TableHead>Unidad</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nombre}</TableCell>
                <TableCell>{item.categoria || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.unidadMedida}
                  </Badge>
                </TableCell>
                <TableCell>{formatStock(item)}</TableCell>
                <TableCell>
                  {item.precio > 0 ? `$${item.precio.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>
                  {item.vendiblePorUnidad ? (
                    <Badge className="bg-green-600/20 text-green-400 text-xs">Venta directa</Badge>
                  ) : (
                    <Badge className="bg-blue-600/20 text-blue-400 text-xs">Solo insumo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                    Editar
                  </Button>
                  {deleteConfirmId === item.id ? (
                    <>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                        Confirmar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      Borrar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio de Venta</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) =>
                    setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Costo (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.costo}
                  onChange={(e) =>
                    setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidad de Medida</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.unidadMedida}
                  onChange={(e) =>
                    setFormData({ ...formData, unidadMedida: e.target.value })
                  }
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <CategoryAutocomplete
                  value={formData.categoria}
                  onChange={(val) =>
                    setFormData({ ...formData, categoria: val })
                  }
                  existingCategories={Array.from(new Set(productos.map(p => p.categoria).filter(Boolean))) as string[]}
                />
              </div>
            </div>

            {isLiquido ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tamaño del envase ({formData.unidadMedida})</Label>
                    <Input
                      type="number"
                      step="1"
                      required
                      placeholder={`Ej: 1000 ${formData.unidadMedida}`}
                      value={formData.tamanioEnvase || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tamanioEnvase: parseFloat(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad de envases en stock</Label>
                    <Input
                      type="number"
                      step="1"
                      required
                      value={formData.cantidadEnvases}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cantidadEnvases: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                  </div>
                </div>
                {formData.tamanioEnvase > 0 && (
                  <div className="text-sm text-blue-400 bg-blue-500/10 p-3 rounded-md">
                    {formData.cantidadEnvases} envase(s) × {formData.tamanioEnvase.toLocaleString()}{' '}
                    {formData.unidadMedida} ={' '}
                    <strong>{stockCalculado.toLocaleString()} {formData.unidadMedida}</strong> en stock
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Label>Stock (unidades)</Label>
                <Input
                  type="number"
                  step="1"
                  required
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-md">
              <input
                type="checkbox"
                id="vendiblePorUnidad"
                checked={formData.vendiblePorUnidad}
                onChange={(e) =>
                  setFormData({ ...formData, vendiblePorUnidad: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="vendiblePorUnidad" className="cursor-pointer text-sm">
                Vendible como unidad cerrada en el POS
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
