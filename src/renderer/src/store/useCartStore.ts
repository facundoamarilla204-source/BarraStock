import { create } from 'zustand'

export interface CartItem {
  id: string
  nombre: string
  tipo: 'producto' | 'receta'
  precio: number
  costo?: number
  cantidad: number
  descuento?: number
  tipoDescuento?: 'porcentaje' | 'fijo'
  valorDescuento?: number
}

interface CartStore {
  items: CartItem[]
  metodoPago: 'efectivo' | 'transferencia' | 'débito' | 'crédito' | 'qr' | 'pago_dividido'
  descuentoGlobal?: number
  tipoDescuentoGlobal?: 'porcentaje' | 'fijo'
  valorDescuentoGlobal?: number
  
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (id: string, tipo: 'producto' | 'receta') => void
  updateQuantity: (id: string, tipo: 'producto' | 'receta', cantidad: number) => void
  setMetodoPago: (metodo: 'efectivo' | 'transferencia' | 'débito' | 'crédito' | 'qr' | 'pago_dividido') => void
  setDescuentoItem: (id: string, tipo: 'producto' | 'receta', tipoDescuento: 'porcentaje' | 'fijo' | undefined, valorDescuento: number | undefined) => void
  setDescuentoGlobal: (tipo: 'porcentaje' | 'fijo' | undefined, valor: number | undefined) => void
  clearCart: () => void
  
  getSubtotal: () => number
  getTotalDescuentos: () => number
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  metodoPago: 'efectivo',
  descuentoGlobal: 0,
  tipoDescuentoGlobal: undefined,
  valorDescuentoGlobal: undefined,
  
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(i => i.id === item.id && i.tipo === item.tipo)
      if (existing) {
        return {
          items: state.items.map(i => 
            (i.id === item.id && i.tipo === item.tipo) 
              ? { ...i, cantidad: i.cantidad + 1 } 
              : i
          )
        }
      }
      return { items: [...state.items, { ...item, cantidad: 1 }] }
    })
  },
  
  removeItem: (id, tipo) => {
    set((state) => ({
      items: state.items.filter(i => !(i.id === id && i.tipo === tipo))
    }))
  },
  
  updateQuantity: (id, tipo, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(id, tipo)
      return
    }
    set((state) => ({
      items: state.items.map(i => 
        (i.id === id && i.tipo === tipo) 
          ? { ...i, cantidad } 
          : i
      )
    }))
  },
  
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  
  setDescuentoItem: (id, tipo, tipoDescuento, valorDescuento) => {
    set((state) => ({
      items: state.items.map(i => {
        if (i.id === id && i.tipo === tipo) {
          let descuento = 0;
          const subtotal = i.precio * i.cantidad;
          if (tipoDescuento === 'porcentaje' && valorDescuento) {
            descuento = subtotal * (valorDescuento / 100);
          } else if (tipoDescuento === 'fijo' && valorDescuento) {
            descuento = valorDescuento;
          }
          // Asegurar que no sea mayor al subtotal ni negativo
          if (descuento > subtotal) descuento = subtotal;
          if (descuento < 0) descuento = 0;

          return { ...i, tipoDescuento, valorDescuento, descuento };
        }
        return i;
      })
    }))
  },

  setDescuentoGlobal: (tipo, valor) => {
    set((state) => {
      let descuento = 0;
      const subtotalItems = state.items.reduce((acc, item) => acc + (item.precio * item.cantidad) - (item.descuento || 0), 0);
      
      if (tipo === 'porcentaje' && valor) {
        descuento = subtotalItems * (valor / 100);
      } else if (tipo === 'fijo' && valor) {
        descuento = valor;
      }
      
      if (descuento > subtotalItems) descuento = subtotalItems;
      if (descuento < 0) descuento = 0;
      
      return { tipoDescuentoGlobal: tipo, valorDescuentoGlobal: valor, descuentoGlobal: descuento };
    });
  },

  clearCart: () => set({ 
    items: [], 
    metodoPago: 'efectivo',
    descuentoGlobal: 0,
    tipoDescuentoGlobal: undefined,
    valorDescuentoGlobal: undefined 
  }),
  
  getSubtotal: () => {
    return get().items.reduce((total, item) => total + (item.precio * item.cantidad), 0)
  },

  getTotalDescuentos: () => {
    const itemDescuentos = get().items.reduce((total, item) => total + (item.descuento || 0), 0);
    const globalDescuento = get().descuentoGlobal || 0;
    return itemDescuentos + globalDescuento;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const descuentos = get().getTotalDescuentos();
    return Math.max(0, subtotal - descuentos);
  }
}))
