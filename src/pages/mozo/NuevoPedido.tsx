import { useState, useMemo, useEffect } from 'react'
import Fuse from 'fuse.js'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProductos, getCategorias } from '@/services/products'
import { supabase } from '@/lib/supabase'
import { useSubcategoriasMap } from '@/hooks/useSubcategoriasMap'
import { getMesas } from '@/services/tables'
import { createPedido } from '@/services/orders'
import { useCartStore } from '@/store/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { ShoppingBag, Plus, Minus, Trash2, ChevronLeft, Send, Search, X } from 'lucide-react'
import type { Producto } from '@/types'
import { clsx } from 'clsx'
import { getSubcategoriaOrder } from '@/config/subcategorias'


function ProductoCard({ producto, onAdd, showCategoria }: { producto: Producto; onAdd: () => void; showCategoria?: boolean }) {
  return (
    <button
      onClick={onAdd}
      className="card px-3 py-2.5 text-left hover:border-bronceado/30 active:scale-95 transition-all duration-200 group flex items-center gap-2"
    >
      {showCategoria && producto.categoria && (
        <span className="text-[9px] font-bold text-tierra-muted bg-windsor-lighter rounded px-1.5 py-0.5 leading-none flex-shrink-0">
          {producto.categoria.nombre}
        </span>
      )}
      <p className="font-body font-bold text-tierra group-hover:text-bronceado transition-colors text-sm leading-none flex-1 truncate">
        {producto.nombre}
      </p>
      <span className="w-6 h-6 rounded-lg bg-bronceado/10 text-bronceado flex items-center justify-center group-hover:bg-bronceado group-hover:text-windsor transition-colors flex-shrink-0">
        <Plus size={13} />
      </span>
    </button>
  )
}

export function NuevoPedido() {
  const { mesaId } = useParams<{ mesaId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [notaGlobal, setNotaGlobal] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const queryClient = useQueryClient()
  const { items, addItem, removeItem, updateQty, updateNota, clearCart, setMesa, mesaId: cartMesaId, total } = useCartStore()

  useEffect(() => {
    const channel = supabase
      .channel('productos-disponibilidad-mozo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['productos'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  useEffect(() => {
    if (!mesaId) return
    if (cartMesaId !== mesaId) {
      clearCart()
      setMesa(mesaId)
    }
  }, [mesaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: mesas } = useQuery({
    queryKey: ['mesas'],
    queryFn: getMesas,
  })
  const mesaActual = mesas?.find(m => m.id === mesaId)

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  })

  const categoriasFila1 = useMemo(() => categorias?.filter(c => (c.fila ?? 1) === 1).sort((a, b) => a.orden - b.orden) ?? [], [categorias])
  const categoriasFila2 = useMemo(() => categorias?.filter(c => c.fila === 2).sort((a, b) => a.orden - b.orden) ?? [], [categorias])

  const subcategoriaOrderMap = useSubcategoriasMap()

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: getProductos,
  })

  const productosPorCategoria = useMemo(
    () => productos?.filter((p) => selectedCategoria ? p.categoria_id === selectedCategoria : true) ?? [],
    [productos, selectedCategoria]
  )

  const fuseGlobal = useMemo(() => new Fuse(productos ?? [], {
    keys: [
      { name: 'nombre',           weight: 0.6 },
      { name: 'descripcion',      weight: 0.25 },
      { name: 'categoria.nombre', weight: 0.15 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  }), [productos])

  const searching = busqueda.trim().length > 0
  const filteredProductos = searching
    ? fuseGlobal.search(busqueda.trim()).map((r) => r.item)
    : productosPorCategoria

  const productosAgrupados = useMemo(() => {
    if (searching || !selectedCategoria) return null
    const catNombre = categorias?.find(c => c.id === selectedCategoria)?.nombre ?? ''

    let order: string[] | null = null
    if (subcategoriaOrderMap) {
      const lower = catNombre.toLowerCase()
      for (const [key, ord] of subcategoriaOrderMap) {
        if (lower.includes(key)) { order = ord; break }
      }
    }
    if (!order) order = getSubcategoriaOrder(catNombre)
    if (!order) return null

    const groups = new Map<string, typeof productosPorCategoria>()
    for (const p of productosPorCategoria) {
      const sub = p.subcategoria ?? ''
      if (!groups.has(sub)) groups.set(sub, [])
      groups.get(sub)!.push(p)
    }

    const result: { subcategoria: string; productos: typeof productosPorCategoria }[] = []
    for (const sub of order) {
      if (groups.has(sub)) {
        result.push({ subcategoria: sub, productos: groups.get(sub)! })
        groups.delete(sub)
      }
    }
    for (const [sub, prods] of groups) {
      result.push({ subcategoria: sub, productos: prods })
    }
    return result
  }, [searching, selectedCategoria, productosPorCategoria, categorias, subcategoriaOrderMap])

  const handleEnviar = async () => {
    if (!mesaId || !user || items.length === 0) return
    setSending(true)

    try {
      const allNullPanel = items.every((i) => !i.producto.panel)
      const panels = [...new Set(
        items.map((i) => i.producto.panel).filter(Boolean)
      )] as ('cocina' | 'postres')[]

      await createPedido(
        mesaId,
        user.id,
        items.map((i) => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          precio_unitario: i.producto.precio,
          notas: i.notas,
        })),
        notaGlobal || undefined,
        allNullPanel ? 'entregado' : 'pendiente',
        mesaActual?.cliente ?? undefined,
        panels
      )
      clearCart()
      setSent(true)
      setTimeout(() => navigate('/mozo'), 1500)
    } catch (err) {
      console.error(err)
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-jade/20 flex items-center justify-center mb-4">
          <Send size={28} className="text-jade" />
        </div>
        <h3 className="font-heading text-xl text-tierra-light">¡Pedido enviado!</h3>
        <p className="text-tierra-muted text-sm mt-1">La cocina ya lo recibió</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-32">
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={() => navigate('/mozo')}
          className="p-1 rounded-lg hover:bg-windsor-lighter text-tierra-muted transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-heading text-sm text-tierra-light">Nuevo pedido</span>
      </div>

      {/* Buscador + Filtros sticky */}
      <div className="sticky top-14 z-20 bg-windsor -mx-4 px-4 pt-2 pb-3">
        {/* Buscador */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-windsor-lighter border-2 border-tierra/15 rounded-xl pl-9 pr-9 py-2.5 text-sm text-tierra placeholder-tierra-muted focus:outline-none focus:border-bronceado/50 transition-colors"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-muted hover:text-tierra"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Fila 1 de categorías */}
        <div className={clsx('flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 transition-opacity duration-200', searching && 'opacity-30 pointer-events-none')}>
          {categoriasFila1.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoria(selectedCategoria === cat.id ? null : cat.id)}
              className={clsx(
                'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors',
                selectedCategoria === cat.id
                  ? 'bg-bronceado text-windsor'
                  : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
              )}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Fila 2 de categorías */}
        {categoriasFila2.length > 0 && (
          <div className={clsx('flex gap-1.5 overflow-x-auto scrollbar-hide pt-1 pb-1 transition-opacity duration-200', searching && 'opacity-30 pointer-events-none')}>
            {categoriasFila2.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(selectedCategoria === cat.id ? null : cat.id)}
                className={clsx(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors',
                  selectedCategoria === cat.id
                    ? 'bg-bronceado text-windsor'
                    : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
                )}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filteredProductos?.length === 0 ? (
        <p className="text-center text-tierra-muted text-sm py-12">Sin resultados para "{busqueda}"</p>
      ) : productosAgrupados ? (
        <div className="flex flex-col gap-5 mt-3">
          {productosAgrupados.map(({ subcategoria, productos }) => (
            <div key={subcategoria}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-bold text-rubi uppercase tracking-widest flex-shrink-0">
                  {subcategoria}
                </span>
                <div className="flex-1 h-px bg-rubi/20" />
              </div>
              <div className="flex flex-col gap-1.5">
                {productos.map((producto) => (
                  <ProductoCard key={producto.id} producto={producto} onAdd={() => addItem(producto)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-2">
          {filteredProductos?.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} onAdd={() => addItem(producto)} showCategoria={searching} />
          ))}
        </div>
      )}

      {/* Cart FAB */}
      {items.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-24 right-4 bg-bronceado text-windsor font-bold rounded-2xl px-5 py-3.5 shadow-premium flex items-center gap-3 active:scale-95 transition-all z-30"
        >
          <ShoppingBag size={20} />
          <span>{items.length} items</span>
          <span className="bg-windsor/30 px-2 py-0.5 rounded-lg text-sm">
            ${total().toFixed(2)}
          </span>
        </button>
      )}

      {/* Cart Modal */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Tu pedido" size="md">
        <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide mb-4">
          {items.map((item) => (
            <div key={item.producto.id} className="bg-windsor-lighter rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-tierra text-sm font-bold">{item.producto.nombre}</span>
                <button onClick={() => removeItem(item.producto.id)}>
                  <Trash2 size={14} className="text-rubi-light" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.producto.id, item.cantidad - 1)}
                    className="w-7 h-7 rounded-lg bg-windsor-card flex items-center justify-center text-tierra"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-tierra font-bold w-5 text-center">{item.cantidad}</span>
                  <button
                    onClick={() => updateQty(item.producto.id, item.cantidad + 1)}
                    className="w-7 h-7 rounded-lg bg-windsor-card flex items-center justify-center text-tierra"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="text-bronceado text-sm font-bold">
                  ${(item.producto.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
              <input
                type="text"
                placeholder="Nota (ej: sin sal)"
                value={item.notas ?? ''}
                onChange={(e) => updateNota(item.producto.id, e.target.value)}
                className="mt-2 w-full bg-windsor-card border border-tierra/10 rounded-lg px-3 py-1.5 text-xs text-tierra placeholder-tierra-muted focus:outline-none focus:border-bronceado/30"
              />
            </div>
          ))}
        </div>

        <Textarea
          label="Nota general del pedido"
          placeholder="Ej: alergia al gluten, apurar mesa 3..."
          value={notaGlobal}
          onChange={(e) => setNotaGlobal(e.target.value)}
          rows={2}
          className="mb-4 text-sm"
        />

        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-tierra-muted text-sm">Total</span>
          <span className="font-heading text-xl text-bronceado">${total().toFixed(2)}</span>
        </div>

        <Button onClick={handleEnviar} loading={sending} size="lg" className="w-full">
          <Send size={18} className="mr-2" />
          Enviar a cocina
        </Button>
      </Modal>
    </div>
  )
}
