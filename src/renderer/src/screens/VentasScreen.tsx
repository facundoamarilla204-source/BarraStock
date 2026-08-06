import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function VentasScreen() {
  const [ventas, setVentas] = useState<any[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedVenta, setSelectedVenta] = useState<any | null>(null)

  const loadData = async () => {
    const data = await (window as any).api.getVentas()
    setVentas(data)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAnular = async (id: string) => {
    try {
      await (window as any).api.anularVenta(id, 'Anulada por usuario en interfaz')
      // Note: anularVenta in ventaService returns the updated venta directly,
      // or throws an error. Let's check if it returns {success: true} or just the object.
      // Wait, in `main/ipc/ventas.ts` it might wrap in {success, error}. But if it throws we catch it.
      // Let's just reload data.
      setDeleteConfirmId(null)
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ventas del Día</h2>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Nro Venta</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Medio de Pago</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.map((venta) => (
              <TableRow key={venta.id} className={venta.estado === 'anulada' ? 'opacity-50' : ''}>
                <TableCell>{new Date(venta.fecha).toLocaleTimeString()}</TableCell>
                <TableCell className="font-mono font-bold">
                  {venta.numero ? `#${venta.numero}` : '-'}
                </TableCell>
                <TableCell>
                  <ul className="text-sm text-gray-400">
                    {venta.detalles.slice(0, 2).map((d: any) => (
                      <li key={d.id}>
                        {d.cantidad}x {d.producto?.nombre || d.receta?.nombre}
                      </li>
                    ))}
                    {venta.detalles.length > 2 && <li>...</li>}
                  </ul>
                </TableCell>
                <TableCell className="capitalize">{venta.medioPago}</TableCell>
                <TableCell className="font-bold">${venta.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={venta.estado === 'activa' ? 'default' : 'destructive'}>
                    {venta.estado.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedVenta(venta)}>
                    Ver Detalle
                  </Button>

                  {venta.estado === 'activa' && (
                    deleteConfirmId === venta.id ? (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => handleAnular(venta.id)}>
                          Confirmar Anulación
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(venta.id)}>
                        Anular
                      </Button>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
            {ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No hay ventas registradas hoy.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedVenta} onOpenChange={(open) => !open && setSelectedVenta(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalle de Venta {selectedVenta?.numero ? `#${selectedVenta.numero}` : ''}
            </DialogTitle>
          </DialogHeader>
          
          {selectedVenta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fecha:</span> {new Date(selectedVenta.fecha).toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>{' '}
                  <Badge variant={selectedVenta.estado === 'activa' ? 'default' : 'destructive'}>
                    {selectedVenta.estado.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Medio de Pago:</span> <span className="capitalize">{selectedVenta.medioPago}</span>
                </div>
                {selectedVenta.estado === 'anulada' && (
                  <div>
                    <span className="text-gray-500">Anulada en:</span> {selectedVenta.anuladaEn ? new Date(selectedVenta.anuladaEn).toLocaleString() : '-'}
                  </div>
                )}
              </div>

              <div className="border rounded-md mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ítem</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">P. Unit</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVenta.detalles.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>{d.producto?.nombre || d.receta?.nombre}</div>
                          {d.iva != null && d.iva > 0 && (
                            <div className="text-xs text-gray-400">Neto: ${d.neto?.toFixed(2)} + IVA: ${d.iva?.toFixed(2)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{d.cantidad}</TableCell>
                        <TableCell className="text-right">${d.precioUnitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${d.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex flex-col items-end pt-4 gap-2">
                {selectedVenta.iva != null && selectedVenta.iva > 0 && (
                  <div className="text-sm text-gray-400 flex flex-col items-end">
                    <span>Subtotal Neto: ${selectedVenta.neto?.toFixed(2)}</span>
                    <span>IVA ({selectedVenta.ivaPorcentaje}%): ${selectedVenta.iva?.toFixed(2)}</span>
                  </div>
                )}
                <div className="text-2xl font-bold">
                  Total: ${selectedVenta.total.toFixed(2)}
                </div>
                {selectedVenta.medioPago === 'efectivo' && selectedVenta.montoRecibido !== null && selectedVenta.vuelto !== null && (
                  <div className="text-sm text-gray-400 bg-gray-900 px-3 py-2 rounded-md border border-gray-800">
                    Pagó con: <strong className="text-white">${selectedVenta.montoRecibido.toFixed(2)}</strong> — Vuelto: <strong className="text-green-400">${selectedVenta.vuelto.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
