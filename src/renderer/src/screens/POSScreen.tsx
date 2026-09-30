import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '../store/useCartStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { LayoutGrid, Maximize, Minimize, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tag } from 'lucide-react'

export function POSScreen() {
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [montoRecibido, setMontoRecibido] = useState<string>('')
  const [costoDelivery, setCostoDelivery] = useState<string>('')
  const [showDeliveryInput, setShowDeliveryInput] = useState(false)
  const [ivaInfo, setIvaInfo] = useState({ activo: false, porcentaje: 21 })
  const [scanMessage, setScanMessage] = useState<{text: string, type: 'error'|'success'} | null>(null)
  
  // Pago Dividido
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pagos, setPagos] = useState<{ medioPago: string, monto: number }[]>([])
  const [nuevoPagoMedio, setNuevoPagoMedio] = useState<string>('Efectivo')
  const [nuevoPagoMonto, setNuevoPagoMonto] = useState<string>('')
  
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState<number | null>(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  
  const [cardSize, setCardSize] = useState<'chico' | 'mediano' | 'grande'>(() => {
    return (localStorage.getItem('pos_card_size') as any) || 'mediano'
  })

  const cardSizeMap = {
    chico: '110px',
    mediano: '140px',
    grande: '190px'
  }
  
  // Descuentos
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [discountTarget, setDiscountTarget] = useState<'producto' | 'venta'>('producto')
  const [discountType, setDiscountType] = useState<'porcentaje' | 'fijo'>('porcentaje')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountItemId, setDiscountItemId] = useState<{id: string, tipo: 'producto' | 'receta'} | null>(null)
  
  const cart = useCartStore()
  
  const totalGeneral = cart.getTotal() + (parseFloat(costoDelivery) || 0)

  // Sincronizar monto recibido con el total cuando cambia el método de pago
  useEffect(() => {
    if (cart.metodoPago === 'efectivo') {
      if (montoRecibido === '') {
        setMontoRecibido(totalGeneral.toString())
      }
    }
  }, [cart.metodoPago])

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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'

      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'F8') {
        e.preventDefault()
        if (cart.items.length === 0 && (parseFloat(costoDelivery) || 0) === 0) {
          alert('Agregá al menos un producto para cobrar.')
          return
        }
        handleCobrar()
        return
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (cart.items.length === 0) {
          cart.clearCart()
          setMontoRecibido('')
          setCostoDelivery('')
          setShowDeliveryInput(false)
          setPagos([])
          setSelectedCartItemIndex(null)
          searchInputRef.current?.focus()
        } else {
          if (confirm('¿Querés iniciar una nueva venta?\nLos productos actuales del carrito se perderán.')) {
            cart.clearCart()
            setMontoRecibido('')
            setCostoDelivery('')
            setShowDeliveryInput(false)
            setPagos([])
            setSelectedCartItemIndex(null)
            searchInputRef.current?.focus()
          }
        }
        return
      }

      // If user is typing in a text field, do not process other shortcuts
      if (isInput) {
        if (e.key === 'Escape' && !isModalOpen && !showShortcutsHelp) {
           target.blur() // Defocus if they press Escape in an input
        }
        return
      }

      if (e.key === 'Escape') {
        if (isModalOpen) {
          e.preventDefault()
          setIsModalOpen(false)
          return
        }
        if (showShortcutsHelp) {
          e.preventDefault()
          setShowShortcutsHelp(false)
          return
        }
      }

      if (!isModalOpen && !showShortcutsHelp) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (cart.items.length > 0) {
            setSelectedCartItemIndex(prev => (prev === null || prev >= cart.items.length - 1) ? 0 : prev + 1)
          }
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (cart.items.length > 0) {
            setSelectedCartItemIndex(prev => (prev === null || prev <= 0) ? cart.items.length - 1 : prev - 1)
          }
        }

        if (e.key === 'Delete' && selectedCartItemIndex !== null && cart.items[selectedCartItemIndex]) {
          e.preventDefault()
          const item = cart.items[selectedCartItemIndex]
          cart.removeItem(item.id, item.tipo)
          setSelectedCartItemIndex(prev => {
            if (prev === null) return null
            if (prev >= cart.items.length - 1) return Math.max(0, cart.items.length - 2)
            return prev
          })
        }

        if (e.key === '+' && selectedCartItemIndex !== null && cart.items[selectedCartItemIndex]) {
          e.preventDefault()
          const item = cart.items[selectedCartItemIndex]
          const dbItem = items.find(i => i.id === item.id && i.tipo === item.tipo)
          if (dbItem && item.cantidad < dbItem.maxStock) {
            cart.updateQuantity(item.id, item.tipo, item.cantidad + 1)
          }
        }

        if (e.key === '-' && selectedCartItemIndex !== null && cart.items[selectedCartItemIndex]) {
          e.preventDefault()
          const item = cart.items[selectedCartItemIndex]
          if (item.cantidad > 1) {
            cart.updateQuantity(item.id, item.tipo, item.cantidad - 1)
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cart, isModalOpen, showShortcutsHelp, selectedCartItemIndex, items, costoDelivery])

  const filtered = items.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase()) || 
                        (i.codigoBarras && i.codigoBarras.includes(search.toLowerCase()))
    const matchCat = categoria ? i.categoria?.toLowerCase() === categoria.toLowerCase() : true
    return matchSearch && matchCat
  })

  // Obtener categorías únicas para los botones rápidos
  const categorias = Array.from(new Set(items.map(i => i.categoria).filter(Boolean)))

  const handleCobrar = async () => {
    const deliveryNum = parseFloat(costoDelivery) || 0
    if (cart.items.length === 0 && deliveryNum === 0) return
    
    if (cart.metodoPago === 'pago_dividido') {
      setIsModalOpen(true)
      return
    }

    const isEfectivo = cart.metodoPago === 'efectivo'
    const montoNum = parseFloat(montoRecibido)
    
    if (isEfectivo && (isNaN(montoNum) || montoNum < totalGeneral)) {
      alert('El monto recibido es menor al total')
      return
    }

    const vueltoNum = isEfectivo ? montoNum - totalGeneral : undefined
    const finalMontoRecibido = isEfectivo ? montoNum : undefined

    try {
      const payload = cart.items.map(i => ({
        id: i.id,
        tipo: i.tipo,
        cantidad: i.cantidad,
        precioUnitario: i.precio,
        costoUnitario: i.costo,
        descuento: i.descuento || 0,
        tipoDescuento: i.tipoDescuento,
        valorDescuento: i.valorDescuento
      }))
      const res = await (window as any).api.procesarVenta(
        payload, 
        cart.metodoPago, 
        finalMontoRecibido, 
        vueltoNum, 
        deliveryNum, 
        undefined, 
        cart.descuentoGlobal, 
        cart.tipoDescuentoGlobal, 
        cart.valorDescuentoGlobal
      )
      if (res.success) {
        alert('Venta procesada con éxito')
        cart.clearCart()
        setMontoRecibido('')
        setCostoDelivery('')
        setShowDeliveryInput(false)
        loadData() // Recargar para actualizar stocks
      } else {
        alert('Error: ' + (res.message || res.error))
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const confirmarPagoDividido = async () => {
    const deliveryNum = parseFloat(costoDelivery) || 0
    if (cart.items.length === 0 && deliveryNum === 0) return

    const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0)
    if (totalPagado < totalGeneral) {
      alert('Aún falta dinero por cubrir')
      return
    }

    try {
      const payload = cart.items.map(i => ({
        id: i.id,
        tipo: i.tipo,
        cantidad: i.cantidad,
        precioUnitario: i.precio,
        costoUnitario: i.costo,
        descuento: i.descuento || 0,
        tipoDescuento: i.tipoDescuento,
        valorDescuento: i.valorDescuento
      }))
      const res = await (window as any).api.procesarVenta(
        payload, 
        'Pago dividido', 
        undefined, 
        undefined, 
        deliveryNum,
        pagos,
        cart.descuentoGlobal,
        cart.tipoDescuentoGlobal,
        cart.valorDescuentoGlobal
      )
      if (res.success) {
        alert('Venta procesada con éxito')
        cart.clearCart()
        setMontoRecibido('')
        setCostoDelivery('')
        setShowDeliveryInput(false)
        setIsModalOpen(false)
        setPagos([])
        loadData()
      } else {
        alert('Error: ' + (res.message || res.error))
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddPago = () => {
    const monto = parseFloat(nuevoPagoMonto)
    if (isNaN(monto) || monto <= 0) {
      alert('Monto inválido')
      return
    }
    const restante = Math.max(0, totalGeneral - pagos.reduce((a, p) => a + p.monto, 0))
    // We only restrict exceeding if it's not the first payment and we don't have change logic for non-cash. 
    // Wait, the prompt says: "Si el usuario intenta agregar un monto que supera el importe restante, mostrar una validación clara y evitar que se confirme una cantidad inválida."
    if (monto > restante) {
      alert('El monto supera el importe restante.')
      return
    }
    setPagos([...pagos, { medioPago: nuevoPagoMedio, monto }])
    setNuevoPagoMonto('')
  }
  
  const removePago = (index: number) => {
    setPagos(pagos.filter((_, i) => i !== index))
  }

  const handleSizeChange = (size: 'chico' | 'mediano' | 'grande') => {
    setCardSize(size)
    localStorage.setItem('pos_card_size', size)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = search.trim()
      if (!barcode) return
      
      const match = items.find(i => i.codigoBarras === barcode) || filtered[0]
      
      if (match) {
        if (match.maxStock <= 0) {
          setScanMessage({ text: `Agotado: ${match.nombre}`, type: 'error' })
        } else {
          cart.addItem({ id: match.id, nombre: match.nombre, tipo: match.tipo, precio: match.precio, costo: match.costo })
          setScanMessage({ text: `Agregado: ${match.nombre}`, type: 'success' })
        }
        setSearch('')
      } else {
        setScanMessage({ text: `Código o producto no encontrado`, type: 'error' })
        setSearch('')
      }
      
      setTimeout(() => setScanMessage(null), 3000)
    }
  }

  const openDiscountModal = (target: 'producto' | 'venta', itemId?: {id: string, tipo: 'producto' | 'receta'}) => {
    setDiscountTarget(target)
    if (target === 'producto' && itemId) {
      setDiscountItemId(itemId)
      const item = cart.items.find(i => i.id === itemId.id && i.tipo === itemId.tipo)
      if (item && item.tipoDescuento && item.valorDescuento) {
        setDiscountType(item.tipoDescuento)
        setDiscountValue(item.valorDescuento.toString())
      } else {
        setDiscountType('porcentaje')
        setDiscountValue('')
      }
    } else {
      setDiscountItemId(null)
      if (cart.tipoDescuentoGlobal && cart.valorDescuentoGlobal) {
        setDiscountType(cart.tipoDescuentoGlobal)
        setDiscountValue(cart.valorDescuentoGlobal.toString())
      } else {
        setDiscountType('porcentaje')
        setDiscountValue('')
      }
    }
    setIsDiscountModalOpen(true)
  }

  const applyDiscount = () => {
    const val = parseFloat(discountValue)
    if (isNaN(val) || val < 0) {
      alert('El valor del descuento debe ser un número positivo')
      return
    }

    if (discountTarget === 'producto' && discountItemId) {
      cart.setDescuentoItem(discountItemId.id, discountItemId.tipo, discountType, val)
    } else {
      cart.setDescuentoGlobal(discountType, val)
    }
    setIsDiscountModalOpen(false)
  }

  const removeDiscount = () => {
    if (discountTarget === 'producto' && discountItemId) {
      cart.setDescuentoItem(discountItemId.id, discountItemId.tipo, undefined, undefined)
    } else {
      cart.setDescuentoGlobal(undefined, undefined)
    }
    setIsDiscountModalOpen(false)
  }

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Barra superior de atajos */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 flex gap-4 text-xs md:text-sm text-gray-400 overflow-x-auto whitespace-nowrap shrink-0 items-center shadow-sm">
        <span className="font-bold text-blue-400 pl-2 tracking-wide uppercase text-[10px] md:text-xs">Atajos rápidos</span>
        <div className="h-4 w-px bg-gray-800"></div>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">F2</kbd> Buscar</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">F8</kbd> Cobrar</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">Ctrl+N</kbd> Nueva Venta</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">Enter</kbd> Elegir</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">↑ ↓</kbd> Navegar Carrito</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">+ / -</kbd> Cantidad</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">Supr</kbd> Borrar Ítem</span>
        <span className="flex items-center gap-1"><kbd className="bg-gray-800 border-b-2 border-gray-700 text-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</kbd> Cerrar/Cancelar</span>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 overflow-hidden">
        {/* Catálogo (Izquierda) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        <div className="flex flex-col gap-1">
          <Input 
            ref={searchInputRef}
            placeholder="Escanear o buscar producto..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 text-lg shrink-0"
          />
          {scanMessage && (
            <div className={`text-sm px-2 py-1 rounded-md ${scanMessage.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {scanMessage.text}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 items-center justify-between">
          <div className="flex gap-2">
            <Button 
              variant={categoria === null ? 'default' : 'outline'} 
              onClick={() => setCategoria(null)}
              className="whitespace-nowrap"
            >
              Todos
            </Button>
            {categorias.map(cat => (
              <Button 
                key={cat as string} 
                variant={categoria === cat ? 'default' : 'outline'}
                onClick={() => setCategoria(cat as string)}
                className="whitespace-nowrap"
              >
                {cat as string}
              </Button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg shrink-0">
             <Button variant={cardSize === 'chico' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSizeChange('chico')} title="Pequeño" className="px-2 h-8">
               <Minimize className="w-4 h-4" />
             </Button>
             <Button variant={cardSize === 'mediano' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSizeChange('mediano')} title="Mediano" className="px-2 h-8">
               <LayoutGrid className="w-4 h-4" />
             </Button>
             <Button variant={cardSize === 'grande' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleSizeChange('grande')} title="Grande" className="px-2 h-8">
               <Maximize className="w-4 h-4" />
             </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 border rounded-md p-4 bg-gray-900/50">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSizeMap[cardSize]}, 1fr))` }}>
            {filtered.map(item => {
              const agotado = item.maxStock <= 0;
              return (
                <div 
                  key={`${item.tipo}-${item.id}`} 
                  className={`bg-gray-800 border ${agotado ? 'border-red-900/50 opacity-50' : 'border-gray-700 hover:bg-gray-700 cursor-pointer'} rounded-lg p-2.5 transition-colors flex flex-col justify-between min-h-[100px]`}
                  onClick={() => {
                    if (!agotado) {
                      cart.addItem({ id: item.id, nombre: item.nombre, tipo: item.tipo, precio: item.precio, costo: item.costo })
                    }
                  }}
                  title={item.nombre}
                >
                  <div className="min-w-0">
                    <div className="flex flex-col gap-2 mb-2">
                      {item.imagen && (
                        <div className="w-full aspect-square bg-gray-900 rounded-md overflow-hidden shrink-0 border border-gray-700 p-1">
                          <img 
                            src={`bs-img://${item.imagen}`} 
                            alt={item.nombre} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-sm leading-tight break-words">{item.nombre}</span>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant={item.tipo === 'receta' ? 'default' : 'secondary'} className="text-[9px] px-1 py-0 h-4">
                            {item.tipo}
                          </Badge>
                          {agotado && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Agotado</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end gap-2 flex-wrap mt-2">
                    <div className={cn("font-bold text-blue-400 shrink-0", cardSize === 'chico' ? "text-base" : "text-xl")}>
                      ${item.precio.toFixed(2)}
                    </div>
                    {!agotado && <div className="text-[11px] sm:text-xs text-gray-500 whitespace-nowrap">Stock: {item.maxStock}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Carrito (Derecha) */}
      <div className="w-full md:w-80 lg:w-[420px] md:min-w-[300px] md:shrink-0 bg-gray-900 border border-gray-800 rounded-lg flex flex-col h-1/2 md:h-full">
        <div className="p-3 md:p-4 border-b border-gray-800 shrink-0 flex justify-between items-center">
          <h3 className="text-lg font-bold">Ticket Actual</h3>
          <Button variant="outline" size="sm" onClick={() => openDiscountModal('venta')}>
            <Tag className="w-4 h-4 mr-2" /> Descuento Venta
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {cart.items.map((cartItem, idx) => {
              const baseItem = items.find(i => i.id === cartItem.id && i.tipo === cartItem.tipo);
              const maxStock = baseItem ? baseItem.maxStock : 0;
              const hasEnoughStock = cartItem.cantidad <= maxStock;
              const isSelected = selectedCartItemIndex === idx;

              return (
                <div 
                  key={`${cartItem.tipo}-${cartItem.id}`} 
                  onClick={() => setSelectedCartItemIndex(idx)}
                  className={`flex flex-col p-3 rounded-md border cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800'
                  } ${!hasEnoughStock && !isSelected ? 'border-red-500/50' : ''}`}
                >
                  <div className="flex justify-between font-medium mb-1">
                    <span className={`truncate pr-2 ${hasEnoughStock ? '' : 'text-red-400'}`}>{cartItem.nombre}</span>
                    <span>${((cartItem.precio * cartItem.cantidad) - (cartItem.descuento || 0)).toFixed(2)}</span>
                  </div>
                  {cartItem.descuento && cartItem.descuento > 0 && (
                    <div className="flex justify-between text-xs text-blue-400 mb-1">
                      <span>Desc {cartItem.tipoDescuento === 'porcentaje' ? `${cartItem.valorDescuento}%` : `$${cartItem.valorDescuento}`}:</span>
                      <span>-${cartItem.descuento.toFixed(2)}</span>
                    </div>
                  )}
                  {!hasEnoughStock && (
                    <div className="text-xs text-red-400 mb-2">
                      ¡Stock insuficiente! Disp: {maxStock}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); cart.updateQuantity(cartItem.id, cartItem.tipo, cartItem.cantidad - 1); }}>-</Button>
                      <span className="w-8 text-center">{cartItem.cantidad}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        disabled={cartItem.cantidad >= maxStock}
                        onClick={(e) => { e.stopPropagation(); cart.updateQuantity(cartItem.id, cartItem.tipo, cartItem.cantidad + 1); }}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); openDiscountModal('producto', {id: cartItem.id, tipo: cartItem.tipo}); }}>
                        <Tag className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 px-2" onClick={(e) => { e.stopPropagation(); cart.removeItem(cartItem.id, cartItem.tipo); }}>Quitar</Button>
                    </div>
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
        
        <div className="p-3 md:p-4 bg-gray-950/50 border-t border-gray-800 rounded-b-lg space-y-3 shrink-0">
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
          {cart.items.length > 0 && (
            <div className="flex justify-between items-center text-sm font-medium border-b border-gray-800 pb-2 mb-2">
              <span>Subtotal Productos:</span>
              <span>${cart.getSubtotal().toFixed(2)}</span>
            </div>
          )}

          {cart.getTotalDescuentos() > 0 && (
            <div className="flex justify-between items-center text-sm font-medium text-blue-400 border-b border-gray-800 pb-2 mb-2">
              <span>Descuentos (Prod + Gral):</span>
              <span>-${cart.getTotalDescuentos().toFixed(2)}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-4 border-b border-gray-800 pb-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="flex items-center gap-2">
                Envío (Delivery):
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setShowDeliveryInput(!showDeliveryInput)}>
                  {showDeliveryInput ? 'Ocultar' : 'Agregar'}
                </Button>
              </span>
              <span>${(parseFloat(costoDelivery) || 0).toFixed(2)}</span>
            </div>

            {showDeliveryInput && (
              <div className="flex justify-end mt-1">
                <Input 
                  type="text"
                  inputMode="numeric"
                  placeholder="Costo de envío"
                  value={costoDelivery}
                  onChange={e => setCostoDelivery(e.target.value)}
                  className="w-32 h-8 text-right bg-gray-800 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Total:</span>
            <span className="text-blue-400">${totalGeneral.toFixed(2)}</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              variant={cart.metodoPago === 'efectivo' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('efectivo')}
              size="sm"
            >
              Efectivo
            </Button>
            <Button 
              variant={cart.metodoPago === 'transferencia' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('transferencia')}
              size="sm"
            >
              Transf.
            </Button>
            <Button 
              variant={cart.metodoPago === 'débito' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('débito')}
              size="sm"
            >
              Débito
            </Button>
            <Button 
              variant={cart.metodoPago === 'crédito' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('crédito')}
              size="sm"
            >
              Crédito
            </Button>
            <Button 
              variant={cart.metodoPago === 'qr' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('qr')}
              size="sm"
            >
              QR
            </Button>
            <Button 
              variant={cart.metodoPago === 'pago_dividido' ? 'default' : 'outline'}
              onClick={() => cart.setMetodoPago('pago_dividido')}
              className={cart.metodoPago === 'pago_dividido' ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" : "text-indigo-400 border-indigo-900"}
              size="sm"
            >
              Dividido
            </Button>
          </div>
          
          {cart.metodoPago === 'efectivo' && (
            <div className="space-y-2 bg-gray-900 p-3 rounded-md border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Monto recibido:</span>
                <Input 
                  type="text" 
                  inputMode="numeric"
                  value={montoRecibido} 
                  onChange={e => setMontoRecibido(e.target.value)} 
                  className="w-32 text-right bg-gray-800"
                />
              </div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-gray-300">Vuelto:</span>
                <span className={(parseFloat(montoRecibido) || 0) < totalGeneral ? 'text-red-400' : 'text-green-400'}>
                  ${Math.max(0, (parseFloat(montoRecibido) || 0) - totalGeneral).toFixed(2)}
                </span>
              </div>
              {(parseFloat(montoRecibido) || 0) < totalGeneral && (
                <div className="text-xs text-red-400 text-right">
                  El monto recibido es menor al total
                </div>
              )}
            </div>
          )}
          
          <Button 
            className="w-full h-12 md:h-14 text-base md:text-lg bg-green-600 hover:bg-green-700 text-white flex justify-between px-6" 
            disabled={(cart.items.length === 0 && (parseFloat(costoDelivery)||0) === 0) || (cart.metodoPago === 'efectivo' && (parseFloat(montoRecibido) || 0) < totalGeneral)}
            onClick={handleCobrar}
          >
            <span>Cobrar Venta</span>
            <span className="text-sm opacity-70 border border-white/20 px-2 py-0.5 rounded ml-2">F8</span>
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Cobrar venta (Pago dividido)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="text-xl font-bold text-center bg-gray-950/50 p-4 rounded-lg">
              Total de la venta: <span className="text-blue-400">${totalGeneral.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              {pagos.map((pago, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-800 rounded-md border border-gray-700">
                  <div>
                    <div className="font-bold">{pago.medioPago}</div>
                    <div className="text-sm text-gray-400">${pago.monto.toFixed(2)}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removePago(idx)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {pagos.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No hay pagos agregados</div>
              )}
            </div>

            <div className="p-3 bg-gray-950 rounded-md border border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Total pagado:</span>
                <span className="font-bold text-green-400">${pagos.reduce((a, p) => a + p.monto, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Restante:</span>
                <span className="font-bold text-red-400">${Math.max(0, totalGeneral - pagos.reduce((a, p) => a + p.monto, 0)).toFixed(2)}</span>
              </div>
            </div>

            {Math.max(0, totalGeneral - pagos.reduce((a, p) => a + p.monto, 0)) > 0 && (
              <div className="flex gap-2 items-end pt-2 border-t border-gray-800">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-400">Medio</label>
                  <Select value={nuevoPagoMedio} onValueChange={setNuevoPagoMedio}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Débito">Débito</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-400">Monto</label>
                  <Input 
                    type="number"
                    value={nuevoPagoMonto}
                    onChange={e => setNuevoPagoMonto(e.target.value)}
                    placeholder="0.00"
                    className="bg-gray-800 border-gray-700"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddPago()
                    }}
                  />
                </div>
                <Button onClick={handleAddPago} variant="secondary">Agregar</Button>
              </div>
            )}

          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={confirmarPagoDividido}
              disabled={pagos.reduce((a, p) => a + p.monto, 0) < totalGeneral}
            >
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Help Modal */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Atajos de Teclado</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-y-4 text-sm mt-4">
            <div className="text-gray-400 text-right pr-4 font-mono">F2</div>
            <div>Buscar producto</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">F8</div>
            <div>Cobrar</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">Ctrl + N</div>
            <div>Nueva venta</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">Enter</div>
            <div>Seleccionar / Confirmar</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">ESC</div>
            <div>Cancelar / Cerrar</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">Delete</div>
            <div>Eliminar producto (carrito)</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">+ / -</div>
            <div>Cantidad (carrito)</div>
            
            <div className="text-gray-400 text-right pr-4 font-mono">↑ / ↓</div>
            <div>Navegar carrito</div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowShortcutsHelp(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="max-w-sm bg-gray-900 border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Aplicar Descuento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Aplicar a:</label>
              <Select value={discountTarget} onValueChange={(val: any) => {
                if (val === 'producto' && cart.items.length > 0) {
                   const item = cart.items[selectedCartItemIndex || 0]
                   openDiscountModal('producto', {id: item.id, tipo: item.tipo})
                } else {
                   openDiscountModal('venta')
                }
              }}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="producto" disabled={cart.items.length === 0}>Producto seleccionado</SelectItem>
                  <SelectItem value="venta">Toda la venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de descuento:</label>
              <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                  <SelectItem value="fijo">Importe Fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor:</label>
              <Input 
                type="number" 
                value={discountValue} 
                onChange={e => setDiscountValue(e.target.value)} 
                className="bg-gray-800 border-gray-700" 
                placeholder={discountType === 'porcentaje' ? 'Ej: 10' : 'Ej: 500'}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyDiscount()
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={removeDiscount} className="text-red-400 hover:text-red-300 hover:bg-red-950/30">Quitar Desc.</Button>
            <Button variant="outline" onClick={() => setIsDiscountModalOpen(false)}>Cancelar</Button>
            <Button onClick={applyDiscount} className="bg-blue-600 hover:bg-blue-700">Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
