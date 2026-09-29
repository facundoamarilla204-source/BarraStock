import { create } from 'zustand'

export interface CartItem {
  id: string
  nombre: string
  tipo: 'producto' | 'receta'
  precio: number
  costo?: number
  cantidad: number
}

interface CartStore {
  items: CartItem[]
  metodoPago: 'efectivo' | 'transferencia'
  
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (id: string, tipo: 'producto' | 'receta') => void
  updateQuantity: (id: string, tipo: 'producto' | 'receta', cantidad: number) => void
  setMetodoPago: (metodo: 'efectivo' | 'transferencia') => void
  clearCart: () => void
  
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  metodoPago: 'efectivo',
  
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
  
  clearCart: () => set({ items: [], metodoPago: 'efectivo' }),
  
  getTotal: () => {
    return get().items.reduce((total, item) => total + (item.precio * item.cantidad), 0)
  }
}))
