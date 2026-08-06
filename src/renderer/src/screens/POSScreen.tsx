import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '../store/useCartStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export function POSScreen() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [montoRecibido, setMontoRecibido] = useState<string>('')
  const [ivaInfo, setIvaInfo] = useState({ activo: false, porcentaje: 21 })
  
  const cart = useCartStore()
  
  // Sincronizar monto recibido con el total cuando cambia el carrito o el método de pago
  useEffect(() => {
    if (cart.metodoPago === 'efectivo') {
      const total = cart.getTotal()
      if (montoRecibido === '' || parseFloat(montoRecibido) < total) {
        setMontoRecibido(total.toString())
      }
    }
  }, [cart.items, cart.metodoPago])

  const loadData = async () => {
    const config = await (window as any).api.getConfiguracion()
    const ivaActivo = config?.ivaActivo ?? false
    const ivaPorcentaje = config?.ivaPorcentaje ?? 21
    setIvaInfo({ activo: ivaActivo, porcentaje: ivaPorcentaje })

    const prods = await (window as any).api.getProductos()
    const recs = await (window as any).api.getRecetas()
    
    // Solo mostrar productos con vendiblePorUnidad = true como venta directa
    const productosVendibles = prods
      .filter((p: any) => p.vendiblePorUnidad)
      .map((p: any) => {
        // Calcular maxStock en unidades vendibles
        let maxStock: number
        if (p.tamanioEnvase && p.unidadMedida !== 'unidad') {
          maxStock = Math.floor(p.stock / p.tamanioEnvase)
        } else {
          maxStock = p.stock
        }
        const precioFinal = ivaActivo ? p.precio * (1 + ivaPorcentaje / 100) : p.precio
        return { ...p, tipo: 'producto', maxStock, precioNeto: p.precio, precio: precioFinal }
      })

    const recetasDisponibles = recs.map((r: any) => {
      let maxStock = Infinity
      if (r.items && r.items.length > 0) {
        for (const i of r.items) {
          const stockDisp = i.producto ? i.producto.stock : 0
          const posible = i.cantidad > 0 ? Math.floor(stockDisp / i.cantidad) : 0
          if (posible < maxStock) maxStock = posible
        }
      } else {
        maxStock = 0
      }
      const precioFinal = ivaActivo ? r.precio * (1 + ivaPorcentaje / 100) : r.precio
      return { ...r, tipo: 'receta', maxStock, precioNeto: r.precio, precio: precioFinal }
    })

    setItems([...productosVendibles, ...recetasDisponibles])
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = items.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoria ? i.categoria?.toLowerCase() === categoria.toLowerCase() : true
    return matchSearch && matchCat
  })

  // Obtener categorías únicas para los botones rápidos
  const categorias = Array.from(new Set(items.map(i => i.categoria).filter(Boolean)))

  const handleCobrar = async () => {
    if (cart.items.length === 0) return
    const total = cart.getTotal()
    const isEfectivo = cart.metodoPago === 'efectivo'
    const montoNum = parseFloat(montoRecibido)
    
    if (isEfectivo && (isNaN(montoNum) || montoNum < total)) {
      alert('El monto recibido es menor al total')
      return
    }

    const vueltoNum = isEfectivo ? montoNum - total : undefined
    const finalMontoRecibido = isEfectivo ? montoNum : undefined

    try {
      const payload = cart.items.map(i => ({
        id: i.id,
        tipo: i.tipo,
        cantidad: i.cantidad,
        precioUnitario: i.precio
      }))
      const res = await (window as any).api.procesarVenta(payload, cart.metodoPago, finalMontoRecibido, vueltoNum)
      if (res.success) {
        alert('Venta procesada con éxito')
        cart.clearCart()
        setMontoRecibido('')
        loadData() // Recargar para actualizar stocks
      } else {
        alert('Error: ' + (res.message || res.error))
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="flex h-full gap-6">
      {/* Catálogo (Izquierda) */}
      <div className="flex-1 flex flex-col gap-4">
        <Input 
          placeholder="Buscar producto o receta (autofocus)..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="h-12 text-lg"
        />
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button 
            variant={categoria === null ? 'default' : 'outline'} 
            onClick={() => setCategoria(null)}
          >
            Todos
          </Button>
          {categorias.map(cat => (
            <Button 
              key={cat as string} 
              variant={categoria === cat ? 'default' : 'outline'}
              onClick={() => setCategoria(cat as string)}
            >
              {cat as string}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 border rounded-md p-4 bg-gray-900/50">
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => {
              const agotado = item.maxStock <= 0;
              return (
                <div 
                  key={`${item.tipo}-${item.id}`} 
                  className={`bg-gray-800 border ${agotado ? 'border-red-900/50 opacity-50' : 'border-gray-700 hover:bg-gray-700 cursor-pointer'} rounded-lg p-4 transition-colors flex flex-col justify-between min-h-[120px]`}
                  onClick={() => {
                    if (!agotado) {
                      cart.addItem({ id: item.id, nombre: item.nombre, tipo: item.tipo, precio: item.precio })
                    }
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="font-bold line-clamp-2">{item.nombre}</span>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={item.tipo === 'receta' ? 'default' : 'secondary'}>
                          {item.tipo}
                        </Badge>
                        {agotado && <Badge variant="destructive" className="text-[10px]">Agotado</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xl font-bold text-blue-400">
                      ${item.precio.toFixed(2)}
                    </div>
                    {!agotado && <div className="text-xs text-gray-500">Stock: {item.maxStock}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Carrito (Derecha) */}
      <div className="w-96 bg-gray-900 border border-gray-800 rounded-lg flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold">Ticket Actual</h3>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {cart.items.map(cartItem => {
              const baseItem = items.find(i => i.id === cartItem.id && i.tipo === cartItem.tipo);
              const maxStock = baseItem ? baseItem.maxStock : 0;
              const hasEnoughStock = cartItem.cantidad <= maxStock;

              return (
                <div key={`${cartItem.tipo}-${cartItem.id}`} className={`flex flex-col bg-gray-800 p-3 rounded-md border ${hasEnoughStock ? 'border-transparent' : 'border-red-500/50'}`}>
                  <div className="flex justify-between font-medium mb-2">
                    <span className={`truncate pr-2 ${hasEnoughStock ? '' : 'text-red-400'}`}>{cartItem.nombre}</span>
                    <span>${(cartItem.precio * cartItem.cantidad).toFixed(2)}</span>
                  </div>
                  {!hasEnoughStock && (
                    <div className="text-xs text-red-400 mb-2">
                      ¡Stock insuficiente! Disp: {maxStock}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => cart.updateQuantity(cartItem.id, cartItem.tipo, cartItem.cantidad - 1)}>-</Button>
                      <span className="w-8 text-center">{cartItem.cantidad}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        disabled={cartItem.cantidad >= maxStock}
                        onClick={() => cart.updateQuantity(cartItem.id, cartItem.tipo, cartItem.cantidad + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 px-2" onClick={() => cart.removeItem(cartItem.id, cartItem.tipo)}>Quitar</Button>
                  </div>
                </div>
              )
            })}
            {cart.items.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                El carrito está vacío
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 rounded-b-lg space-y-4">
          {ivaInfo.activo && cart.items.length > 0 && (
            <div className="flex flex-col gap-1 text-sm text-gray-400 mb-2 border-b border-gray-800 pb-2">
              <div className="flex justify-between">
                <span>Subtotal (Neto):</span>
                <span>${(cart.getTotal() / (1 + ivaInfo.porcentaje / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({ivaInfo.porcentaje}%):</span>
                <span>${(cart.getTotal() - (cart.getTotal() / (1 + ivaInfo.porcentaje / 100))).toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Total:</span>
            <span className="text-blue-400">${cart.getTotal().toFixed(2)}</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              variant={cart.metodoPago === 'efectivo' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('efectivo')}
            >
              Efectivo
            </Button>
            <Button 
              className="flex-1" 
              variant={cart.metodoPago === 'transferencia' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('transferencia')}
            >
              Transf.
            </Button>
          </div>
          
          {cart.metodoPago === 'efectivo' && (
            <div className="space-y-2 bg-gray-900 p-3 rounded-md border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Monto recibido:</span>
                <Input 
                  type="number" 
                  value={montoRecibido} 
                  onChange={e => setMontoRecibido(e.target.value)} 
                  className="w-32 text-right bg-gray-800"
                  min={cart.getTotal()}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-gray-300">Vuelto:</span>
                <span className={(parseFloat(montoRecibido) || 0) < cart.getTotal() ? 'text-red-400' : 'text-green-400'}>
                  ${Math.max(0, (parseFloat(montoRecibido) || 0) - cart.getTotal()).toFixed(2)}
                </span>
              </div>
              {(parseFloat(montoRecibido) || 0) < cart.getTotal() && (
                <div className="text-xs text-red-400 text-right">
                  El monto recibido es menor al total
                </div>
              )}
            </div>
          )}
          
          <Button 
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white" 
            disabled={cart.items.length === 0 || (cart.metodoPago === 'efectivo' && (parseFloat(montoRecibido) || 0) < cart.getTotal())}
            onClick={handleCobrar}
          >
            Cobrar Venta
          </Button>
        </div>
      </div>
    </div>
  )
}
