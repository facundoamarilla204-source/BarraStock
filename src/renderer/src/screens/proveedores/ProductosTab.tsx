import { useState, useEffect, useMemo } from 'react'
import { Package, Search, ExternalLink, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface ProductosTabProps {
  proveedorId: string
  onNavigateToProducto?: (productoId: string) => void
  onNavigateToCompras?: () => void
}

export function ProductosTab({ proveedorId, onNavigateToProducto, onNavigateToCompras }: ProductosTabProps) {
  const [compras, setCompras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    ;(window as any).api.getComprasByProveedor(proveedorId)
      .then((data: any[]) => setCompras(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [proveedorId])

  // Procesamiento de datos para agrupar productos
  const { productos, totalComprado, ultimaCompraGeneral } = useMemo(() => {
    const pMap = new Map<string, any>()
    let total = 0
    let lastDate: Date | null = null as Date | null

    compras.forEach(compra => {
      const isAnulada = compra.estado === 'anulada'

      if (!isAnulada) {
        total += compra.total
        const cDate = new Date(compra.fecha)
        if (!lastDate || cDate > lastDate) {
          lastDate = cDate
        }
      }

      compra.detalles.forEach((d: any) => {
        const prodId = d.producto.id
        if (!pMap.has(prodId)) {
          pMap.set(prodId, {
            producto: d.producto,
            ultimoCosto: !isAnulada ? d.costoUnitario : null,
            ultimaCompra: !isAnulada ? compra.fecha : null,
            comprado: !isAnulada ? d.cantidad : 0,
            comprasRealizadas: 1
          })
        } else {
          const entry = pMap.get(prodId)
          entry.comprasRealizadas += 1
          if (!isAnulada) {
            entry.comprado += d.cantidad
            // Como las compras vienen ordenadas desc, la primera no anulada que encontramos es la más reciente
            // Pero por si acaso, verificamos:
            if (entry.ultimoCosto === null || new Date(compra.fecha) > new Date(entry.ultimaCompra)) {
              entry.ultimoCosto = d.costoUnitario
              entry.ultimaCompra = compra.fecha
            }
          }
        }
      })
    })

    return {
      productos: Array.from(pMap.values()),
      totalComprado: total,
      ultimaCompraGeneral: lastDate
    }
  }, [compras])

  // Filtros
  const productosFiltrados = useMemo(() => {
    if (!search) return productos
    const searchLower = search.toLowerCase()
    return productos.filter(p => 
      p.producto.nombre.toLowerCase().includes(searchLower) ||
      (p.producto.codigoInterno && p.producto.codigoInterno.toLowerCase().includes(searchLower)) ||
      (p.producto.codigoBarras && p.producto.codigoBarras.toLowerCase().includes(searchLower))
    )
  }, [productos, search])

  if (loading) return <div className="text-gray-500 text-center py-8">Cargando productos...</div>

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Productos relacionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {productos.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Comprados históricamente
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total comprado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalComprado)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              En operaciones vigentes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-950 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Última compra general</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {ultimaCompraGeneral ? ultimaCompraGeneral.toLocaleDateString() : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {productos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-lg bg-gray-950/50">
          <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">Todavía no hay productos relacionados</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-6">
            Los productos aparecerán automáticamente aquí cuando registres compras para este proveedor.
          </p>
          <Button 
            onClick={onNavigateToCompras}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Registrar una compra
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium text-white">Catálogo histórico del proveedor</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input 
                placeholder="Buscar por nombre o código..." 
                className="pl-9 bg-gray-950 border-gray-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-gray-800 overflow-hidden bg-gray-950/30">
            <Table>
              <TableHeader className="bg-gray-900">
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Producto</TableHead>
                  <TableHead className="text-gray-400">Estado</TableHead>
                  <TableHead className="text-right text-gray-400">Último costo (compra)</TableHead>
                  <TableHead className="text-right text-gray-400">Costo actual (sistema)</TableHead>
                  <TableHead className="text-right text-gray-400">Última compra</TableHead>
                  <TableHead className="text-right text-gray-400">Comprado</TableHead>
                  <TableHead className="text-right text-gray-400 w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.map((p) => (
                  <TableRow key={p.producto.id} className="border-gray-800 hover:bg-gray-900/50">
                    <TableCell>
                      <div>
                        <p className="text-gray-200 font-medium">{p.producto.nombre}</p>
                        <p className="text-xs text-gray-500 flex gap-2">
                          {p.producto.codigoInterno && <span>Ref: {p.producto.codigoInterno}</span>}
                          {p.producto.codigoBarras && <span>EAN: {p.producto.codigoBarras}</span>}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.producto.activo ? "border-green-500/30 text-green-400" : "border-gray-600 text-gray-400"}>
                        {p.producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-white">
                      {p.ultimoCosto !== null ? formatCurrency(p.ultimoCosto) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-gray-400">
                      {formatCurrency(p.producto.costo)}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      {p.ultimaCompra ? new Date(p.ultimaCompra).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      {p.comprado > 0 ? `${p.comprado} unid.` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver historial de compras"
                          onClick={onNavigateToCompras}
                          className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalle del producto"
                          onClick={() => onNavigateToProducto && onNavigateToProducto(p.producto.id)}
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {productosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron productos con la búsqueda actual.
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
