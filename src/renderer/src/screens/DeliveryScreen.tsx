import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Motorbike } from 'lucide-react'

export function DeliveryScreen() {
  const [ventas, setVentas] = useState<any[]>([])
  const [porcentajeDelivery, setPorcentajeDelivery] = useState<string | number>(100)
  const loadData = async () => {
    const config = await (window as any).api.getConfiguracion()
    setPorcentajeDelivery(config?.porcentajeDelivery ?? 100)

    const cajaAbierta = await (window as any).api.getCajaAbierta()

    if (cajaAbierta) {
      const v = await (window as any).api.getVentas()
      // Filtramos las ventas del día que tengan costoDelivery
      const deliveries = v.filter((venta: any) => venta.costoDelivery && venta.costoDelivery > 0)
      setVentas(deliveries)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateConfig = async () => {
    await (window as any).api.updateConfiguracion({ porcentajeDelivery: Number(porcentajeDelivery) })
    alert('Configuración guardada')
    loadData()
  }

  const ventasActivas = ventas.filter(v => v.estado === 'activa')
  const totalCobrado = ventasActivas.reduce((acc, v) => acc + (v.costoDelivery || 0), 0)
  const totalAPagar = ventasActivas.reduce((acc, v) => acc + (v.pagoDelivery || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-100 flex items-center gap-2">
          <Motorbike className="w-8 h-8" />
          Delivery
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Envíos Cobrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-100">${totalCobrado.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Suma de todos los envíos (activos)</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">A Pagar al Repartidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">${totalAPagar.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Según el % al momento de la venta</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Configuración (%)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <div className="flex-1">
               <label className="text-xs text-gray-400">% Ganancia Repartidor</label>
               <Input 
                 type="text" 
                 inputMode="numeric"
                 value={porcentajeDelivery} 
                 onChange={e => setPorcentajeDelivery(e.target.value)}
                 className="bg-gray-800 mt-1"
               />
            </div>
            <Button onClick={handleUpdateConfig} variant="secondary">Guardar</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Viajes del turno actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Venta N°</TableHead>
                  <TableHead className="text-gray-400">Hora</TableHead>
                  <TableHead className="text-gray-400">Estado</TableHead>
                  <TableHead className="text-gray-400 text-right">Cobrado al Cliente</TableHead>
                  <TableHead className="text-gray-400 text-right">Pago al Repartidor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 h-24">
                      No hay envíos registrados en este turno.
                    </TableCell>
                  </TableRow>
                )}
                {ventas.map((v) => (
                  <TableRow key={v.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="font-medium text-gray-300">#{v.numero}</TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.estado === 'activa' ? 'default' : 'destructive'}>
                        {v.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      ${v.costoDelivery?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-blue-400 font-medium">
                      ${v.pagoDelivery?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
