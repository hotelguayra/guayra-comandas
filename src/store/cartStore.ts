import { create } from 'zustand'
import type { CartItem, Producto } from '@/types'

interface CartState {
  items: CartItem[]
  mesaId: string | null
  setMesa: (mesaId: string) => void
  addItem: (producto: Producto) => void
  removeItem: (productoId: string) => void
  updateQty: (productoId: string, cantidad: number) => void
  updateNota: (productoId: string, notas: string) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  mesaId: null,

  setMesa: (mesaId) => set({ mesaId }),

  addItem: (producto) => {
    const existing = get().items.find((i) => i.producto.id === producto.id)
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        ),
      })
    } else {
      set({ items: [...get().items, { producto, cantidad: 1 }] })
    }
  },

  removeItem: (productoId) =>
    set({ items: get().items.filter((i) => i.producto.id !== productoId) }),

  updateQty: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(productoId)
      return
    }
    set({
      items: get().items.map((i) =>
        i.producto.id === productoId ? { ...i, cantidad } : i
      ),
    })
  },

  updateNota: (productoId, notas) =>
    set({
      items: get().items.map((i) =>
        i.producto.id === productoId ? { ...i, notas } : i
      ),
    }),

  clearCart: () => set({ items: [], mesaId: null }),

  total: () =>
    get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),
}))
