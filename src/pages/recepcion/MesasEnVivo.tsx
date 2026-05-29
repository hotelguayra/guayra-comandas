import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Minus, Trash2, Search, Send, X as XIcon } from 'lucide-react'
import {
  getPedidosActivosDeMesa,
  aplicarDescuento,
  cerrarMesaRecepcion,
  calcularTotalPedidos,
  getMesasParaRecepcion,
  eliminarItemPedido,
} from '@/services/recepcion'
import { getProductos, getCategorias } from '@/services/products'
import { useSubcategoriasMap } from '@/hooks/useSubcategoriasMap'
import { getSubcategoriaOrder } from '@/config/subcategorias'
import { createPedido } from '@/services/orders'
import { abrirMesa } from '@/services/tables'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Ticket } from '@/components/print/Ticket'
import { printWithCopies } from '@/lib/print'
import type { Mesa, Pedido, Producto } from '@/types'
import { clsx } from 'clsx'

const MOTIVOS = ['Efectivo', 'Cortesía', 'Empleado', 'Otro']

function ModalAbrirMesa({
  mesa,
  open,
  onClose,
}: {
  mesa: Mesa
  open: boolean
  onClose: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [cliente, setCliente] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAbrir = async () => {
    if (!cliente.trim() || !user) return
    setLoading(true)
    try {
      await abrirMesa(mesa.id, user.id, cliente.trim())
      queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
      setCliente('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Abrir ${mesa.nombre}`} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-tierra-muted block mb-1">Nombre del cliente</label>
          <input
            type="text"
            placeholder="Ej: García, Habitación 5..."
            value={cliente}
            onChange={e => setCliente(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAbrir()}
            autoFocus
            className="input-field w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button size="md" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="md"
            className="flex-1"
            disabled={!cliente.trim()}
            loading={loading}
            onClick={handleAbrir}
          >
            Abrir mesa
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MesaCard({ mesa, onClick }: { mesa: Mesa; onClick: () => void }) {
  const esLibre   = mesa.estado === 'libre'
  const esCuenta  = mesa.estado === 'cuenta'
  const esOcupada = mesa.estado === 'ocupada'

  return (
    <button
      onClick={onClick}
      className={clsx(
        'card p-4 w-full text-left transition-all duration-200 relative',
        'h-28 flex flex-col justify-between overflow-hidden',
        esLibre   && 'border-jade/50 hover:border-jade hover:shadow-glow active:scale-95',
        esOcupada && 'border-bronceado/40 bg-bronceado/5 hover:border-bronceado/70 active:scale-95',
        esCuenta  && 'border-rubi/50 bg-rubi/5 hover:border-rubi-light active:scale-95',
      )}
    >
      {/* Dot indicator */}
      <span className={clsx(
        'absolute top-2.5 right-2.5 w-2 h-2 rounded-full',
        esLibre   && 'bg-jade',
        esOcupada && 'bg-bronceado animate-pulse',
        esCuenta  && 'bg-rubi animate-pulse',
      )} />

      {/* Nombre */}
      <p className={clsx(
        'font-heading text-lg leading-tight pr-5',
        esLibre   && 'text-tierra-light',
        esOcupada && 'text-bronceado',
        esCuenta  && 'text-rubi-light',
      )}>
        {mesa.nombre}
      </p>

      {/* Cliente (siempre ocupa espacio para altura fija) */}
      <p className={clsx(
        'text-sm font-bold truncate',
        mesa.cliente ? 'text-tierra' : 'text-transparent select-none'
      )}>
        {mesa.cliente ?? '—'}
      </p>

      {/* Fila inferior: estado / mozo / total */}
      <div className="flex items-end justify-between gap-1">
        <p className={clsx(
          'text-xs font-bold',
          esLibre   && 'text-jade',
          esOcupada && 'text-bronceado',
          esCuenta  && 'text-rubi-light',
        )}>
          {esLibre   && 'Libre'}
          {esOcupada && (mesa.mozo_activo ? mesa.mozo_activo.nombre : 'Ocupada')}
          {esCuenta  && '● Cuenta'}
        </p>
        {mesa.total_acumulado !== undefined && (
          <p className="text-xs font-bold text-bronceado shrink-0">
            ${mesa.total_acumulado.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    </button>
  )
}

type CartItem = { producto: Producto; cantidad: number }

function ProductoItem({ p, cart, onAdd, fmt }: {
  p: Producto
  cart: CartItem[]
  onAdd: (p: Producto) => void
  fmt: (n: number) => string
}) {
  const enCart = cart.find(i => i.producto.id === p.id)
  return (
    <button
      onClick={() => onAdd(p)}
      className="w-full card px-3 py-2.5 text-left hover:border-bronceado/30 active:scale-95 transition-all duration-150 flex items-center gap-2 group"
    >
      <span className="flex-1 text-sm font-bold text-tierra group-hover:text-bronceado transition-colors truncate">
        {p.nombre}
      </span>
      {enCart && (
        <span className="text-xs font-bold text-bronceado bg-bronceado/15 rounded-lg px-2 py-0.5">
          x{enCart.cantidad}
        </span>
      )}
      <span className="text-xs text-tierra-muted shrink-0">{fmt(p.precio)}</span>
      <span className="w-6 h-6 rounded-lg bg-bronceado/10 text-bronceado flex items-center justify-center group-hover:bg-bronceado group-hover:text-windsor transition-colors shrink-0">
        <Plus size={13} />
      </span>
    </button>
  )
}

function ModalAgregarProductos({
  mesa,
  open,
  onClose,
  onSuccess,
}: {
  mesa: Mesa
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos'],
    queryFn: getProductos,
    enabled: open,
  })
  const { data: categoriasRaw = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
    enabled: open,
  })
  const categorias = useMemo(
    () => [...categoriasRaw].sort((a, b) => (a.fila - b.fila) || (a.orden - b.orden)),
    [categoriasRaw]
  )
  const subcategoriaOrderMap = useSubcategoriasMap()

  const searching = busqueda.trim().length > 0

  const filtered = useMemo(() => {
    let list = selectedCat ? productos.filter(p => p.categoria_id === selectedCat) : productos
    if (searching) {
      const q = busqueda.toLowerCase()
      list = list.filter(p => p.nombre.toLowerCase().includes(q))
    }
    return list
  }, [productos, selectedCat, busqueda, searching])

  const productosAgrupados = useMemo(() => {
    if (searching || !selectedCat) return null
    const catNombre = categorias.find(c => c.id === selectedCat)?.nombre ?? ''
    let order: string[] | null = null
    if (subcategoriaOrderMap) {
      const lower = catNombre.toLowerCase()
      for (const [key, ord] of subcategoriaOrderMap) {
        if (lower.includes(key)) { order = ord; break }
      }
    }
    if (!order) order = getSubcategoriaOrder(catNombre)
    if (!order) return null

    const groups = new Map<string, Producto[]>()
    for (const p of filtered) {
      const sub = p.subcategoria ?? ''
      if (!groups.has(sub)) groups.set(sub, [])
      groups.get(sub)!.push(p)
    }

    const result: { subcategoria: string; productos: Producto[] }[] = []
    for (const sub of order) {
      if (groups.has(sub)) {
        result.push({ subcategoria: sub, productos: groups.get(sub)! })
        groups.delete(sub)
      }
    }
    for (const [sub, prods] of groups) result.push({ subcategoria: sub, productos: prods })
    return result
  }, [searching, selectedCat, filtered, categorias, subcategoriaOrderMap])

  const addItem = (p: Producto) => setCart(prev => {
    const ex = prev.find(i => i.producto.id === p.id)
    if (ex) return prev.map(i => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
    return [...prev, { producto: p, cantidad: 1 }]
  })
  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.producto.id !== id))
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return }
    setCart(prev => prev.map(i => i.producto.id === id ? { ...i, cantidad: qty } : i))
  }

  const totalCart = cart.reduce((s, i) => s + i.producto.precio * i.cantidad, 0)
  const fmt = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handleEnviar = async () => {
    if (!user || cart.length === 0) return
    setSending(true)
    try {
      const panels = [...new Set(cart.map(i => i.producto.panel).filter(Boolean))] as ('cocina' | 'postres')[]
      const allNullPanel = cart.every(i => !i.producto.panel)
      await createPedido(
        mesa.id,
        user!.id,
        cart.map(i => ({ producto_id: i.producto.id, cantidad: i.cantidad, precio_unitario: i.producto.precio })),
        undefined,
        allNullPanel ? 'entregado' : 'pendiente',
        mesa.cliente ?? undefined,
        panels
      )
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setCart([])
        setBusqueda('')
        setSelectedCat(null)
        onSuccess()
        onClose()
      }, 1200)
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setCart([])
    setBusqueda('')
    setSelectedCat(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Agregar a ${mesa.nombre}`} size="lg">
      {sent ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-14 h-14 rounded-full bg-jade/20 flex items-center justify-center">
            <Send size={24} className="text-jade" />
          </div>
          <p className="font-heading text-tierra-light">¡Pedido enviado!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[75vh]">
          {/* Buscador */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-windsor-lighter border border-tierra/15 rounded-xl pl-8 pr-8 py-2 text-sm text-tierra placeholder-tierra-muted focus:outline-none focus:border-bronceado/50 transition-colors"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-tierra-muted hover:text-tierra">
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Categorías — fila 1 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCat(null)}
              className={clsx(
                'px-3 py-1 rounded-xl text-xs font-bold transition-colors',
                !selectedCat ? 'bg-bronceado text-windsor' : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
              )}
            >
              Todos
            </button>
            {categorias.filter(c => (c.fila ?? 1) === 1).map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-bold transition-colors',
                  selectedCat === cat.id ? 'bg-bronceado text-windsor' : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
                )}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* Categorías — fila 2 */}
          {categorias.some(c => c.fila === 2) && (
            <div className="flex gap-2 flex-wrap">
              {categorias.filter(c => c.fila === 2).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                  className={clsx(
                    'px-3 py-1 rounded-xl text-xs font-bold transition-colors',
                    selectedCat === cat.id ? 'bg-bronceado text-windsor' : 'bg-windsor-lighter text-tierra-muted hover:text-tierra'
                  )}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Lista de productos */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-72 space-y-1">
            {productosAgrupados ? (
              <div className="flex flex-col gap-4">
                {productosAgrupados.map(({ subcategoria, productos: prods }) => (
                  <div key={subcategoria}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-rubi uppercase tracking-widest">{subcategoria}</span>
                      <div className="flex-1 h-px bg-rubi/20" />
                    </div>
                    <div className="flex flex-col gap-1">
                      {prods.map(p => <ProductoItem key={p.id} p={p} cart={cart} onAdd={addItem} fmt={fmt} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filtered.map(p => <ProductoItem key={p.id} p={p} cart={cart} onAdd={addItem} fmt={fmt} />)}
              </div>
            )}
          </div>

          {/* Carrito */}
          {cart.length > 0 && (
            <div className="border-t border-tierra/10 pt-3 space-y-2">
              <p className="text-xs text-tierra-muted font-bold uppercase tracking-wide">Pedido</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.producto.id} className="flex items-center gap-2 bg-windsor-lighter rounded-xl px-3 py-2">
                    <span className="flex-1 text-sm text-tierra truncate">{item.producto.nombre}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.producto.id, item.cantidad - 1)} className="w-6 h-6 rounded-lg bg-windsor-card flex items-center justify-center text-tierra hover:text-rubi transition-colors">
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-bold text-tierra w-5 text-center">{item.cantidad}</span>
                      <button onClick={() => updateQty(item.producto.id, item.cantidad + 1)} className="w-6 h-6 rounded-lg bg-windsor-card flex items-center justify-center text-tierra transition-colors">
                        <Plus size={11} />
                      </button>
                    </div>
                    <span className="text-sm text-bronceado font-bold w-20 text-right shrink-0">{fmt(item.producto.precio * item.cantidad)}</span>
                    <button onClick={() => removeItem(item.producto.id)} className="text-tierra-muted hover:text-rubi transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-tierra-muted">Total pedido</span>
                <span className="font-heading text-bronceado font-bold">{fmt(totalCart)}</span>
              </div>
              <Button size="md" onClick={handleEnviar} loading={sending} className="w-full">
                <Send size={15} className="mr-2" />
                Enviar a cocina
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function ModalDetalleMesa({
  mesa,
  open,
  onClose,
}: {
  mesa: Mesa
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  const [descPct, setDescPct] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS[0])

  const { data: pedidos = [], isLoading } = useQuery<Pedido[]>({
    queryKey: ['recepcion-pedidos-mesa', mesa.id],
    queryFn: () => getPedidosActivosDeMesa(mesa.id, mesa.abierta_at),
    enabled: open,
  })

  useEffect(() => {
    if (pedidos.length > 0) {
      const pct = pedidos[0].descuento_porcentaje ?? 0
      setDescPct(pct > 0 ? String(pct) : '')
      setMotivo(pedidos[0].descuento_motivo || MOTIVOS[0])
    }
  }, [pedidos])

  const totales = calcularTotalPedidos(pedidos)
  const pctNum = parseFloat(descPct) || 0
  const descMonto = (totales.subtotal * pctNum) / 100
  const totalFinal = totales.subtotal - descMonto

  const [pendingDeleteItem, setPendingDeleteItem] = useState<{ id: string; nombre: string } | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const handleDeleteItem = async () => {
    if (!pendingDeleteItem) return
    const { id } = pendingDeleteItem
    setPendingDeleteItem(null)
    setDeletingItemId(id)
    try {
      await eliminarItemPedido(id, user?.id, profile?.nombre)
      queryClient.invalidateQueries({ queryKey: ['recepcion-pedidos-mesa', mesa.id] })
      queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingItemId(null)
    }
  }

  const [descuentoAplicado, setDescuentoAplicado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutDescuento = useMutation({
    mutationFn: () => aplicarDescuento(mesa.id, pctNum, motivo, mesa.abierta_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcion-pedidos-mesa', mesa.id] })
      setDescuentoAplicado(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDescuentoAplicado(false), 2000)
    },
  })

  const mutCerrar = useMutation({
    mutationFn: () => cerrarMesaRecepcion(mesa.id, mesa.abierta_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
      onClose()
    },
  })

  const todosCerrados = pedidos.every((p) => p.estado === 'entregado' || p.estado === 'cancelado')
  const hayPendientes = pedidos.some((p) => p.estado === 'pendiente' || p.estado === 'listo' || p.estado === 'en_preparacion')

  const [showWarningCerrar, setShowWarningCerrar] = useState(false)
  const [showAgregarProductos, setShowAgregarProductos] = useState(false)
  const [showPrintOptions, setShowPrintOptions] = useState(false)

  const handleClickCerrar = () => {
    setShowWarningCerrar(true)
  }

  const handleImprimir = (copias: number) => {
    setShowPrintOptions(false)
    printWithCopies(copias)
  }

  const fmt = (n: number) =>
    '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const numeroTicket = pedidos[0]?.numero_ticket

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mesa.nombre}
        subtitle={mesa.cliente || undefined}
        size="lg"
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-bronceado border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {numeroTicket && (
              <div className="flex items-center gap-2 pb-1 border-b border-tierra/10">
                <span className="text-xs text-tierra-muted">Ticket</span>
                <span className="font-mono font-bold text-bronceado text-base">#{numeroTicket}</span>
              </div>
            )}
            {pedidos.map((pedido) => {
              const pedidoTotal = (pedido.items ?? []).reduce(
                (s, i) => s + i.cantidad * i.precio_unitario,
                0
              )
              return (
                <div key={pedido.id} className="bg-windsor-lighter rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-tierra-muted">
                      {pedido.mozo?.nombre} · {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={clsx(
                      'text-xs font-bold px-2 py-0.5 rounded-lg border',
                      pedido.estado === 'pendiente'      && 'text-tierra bg-tierra/10 border-tierra/20',
                      pedido.estado === 'en_preparacion' && 'text-bronceado bg-bronceado/10 border-bronceado/30',
                      pedido.estado === 'listo'          && 'text-jade bg-jade/15 border-jade/40 animate-pulse',
                      pedido.estado === 'entregado'      && 'text-tierra-muted bg-windsor-card border-tierra/15',
                      pedido.estado === 'cancelado'      && 'text-rubi-light bg-rubi/20 border-rubi/40',
                    )}>
                      {pedido.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(pedido.items ?? []).map((item) =>
                      pendingDeleteItem?.id === item.id ? (
                        <div key={item.id} className="flex items-center justify-between gap-2 bg-rubi/10 rounded-lg px-2 py-1.5">
                          <span className="text-rubi-light text-xs font-bold truncate flex-1">
                            ¿Eliminar {item.producto?.nombre}?
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setPendingDeleteItem(null)}
                              className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-windsor-card text-tierra hover:bg-windsor-lighter transition-colors"
                            >
                              No
                            </button>
                            <button
                              onClick={handleDeleteItem}
                              className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-rubi text-white hover:bg-rubi-light transition-colors"
                            >
                              Sí
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={item.id} className="flex items-center justify-between text-sm gap-1">
                          <span className="text-tierra flex-1">
                            {item.producto?.nombre} x{item.cantidad}
                          </span>
                          <span className="text-tierra-muted shrink-0">
                            {fmt(item.cantidad * item.precio_unitario)}
                          </span>
                          <button
                            onClick={() => setPendingDeleteItem({ id: item.id, nombre: item.producto?.nombre ?? '—' })}
                            disabled={deletingItemId === item.id}
                            className="shrink-0 p-0.5 text-tierra-muted/40 hover:text-rubi-light transition-colors"
                          >
                            {deletingItemId === item.id
                              ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
                              : <Trash2 size={12} />
                            }
                          </button>
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-tierra/10">
                    <span className="text-tierra-muted">Subtotal</span>
                    <span className="text-tierra-light">{fmt(pedidoTotal)}</span>
                  </div>
                </div>
              )
            })}

            <div className="card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-tierra-muted">Subtotal general</span>
                <span className="text-tierra-light">{fmt(totales.subtotal)}</span>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-tierra-muted block mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={descPct}
                    onChange={(e) => setDescPct(e.target.value)}
                    placeholder="0"
                    className="input-field w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-tierra-muted block mb-1">Motivo</label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="input-field w-full"
                  >
                    {MOTIVOS.map((m) => (
                      <option key={m} value={m.toLowerCase()}>{m}</option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={mutDescuento.isPending}
                  onClick={() => mutDescuento.mutate()}
                  className={clsx(
                    'inline-flex items-center justify-center gap-1.5 font-body font-bold rounded-xl px-3 py-1.5 text-sm border transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                    descuentoAplicado
                      ? 'bg-jade/15 text-jade border-jade/40'
                      : 'bg-windsor-lighter text-tierra border-tierra/20 hover:border-tierra/40'
                  )}
                >
                  {descuentoAplicado ? <><Check size={13} />Aplicado</> : 'Aplicar'}
                </button>
              </div>

              {pctNum > 0 && (
                <div className="flex justify-between text-sm text-rubi">
                  <span>Descuento {pctNum}%</span>
                  <span>-{fmt(descMonto)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold pt-2 border-t border-tierra/10">
                <span className="text-tierra">TOTAL</span>
                <span className="text-bronceado">{fmt(totalFinal)}</span>
              </div>
            </div>

            <Modal open={showPrintOptions} onClose={() => setShowPrintOptions(false)} title="Imprimir ticket" size="sm" align="center">
              <div className="flex gap-3 pt-2 pb-1">
                <Button size="lg" onClick={() => handleImprimir(1)} className="flex-1">
                  Simple
                </Button>
                <Button size="lg" onClick={() => handleImprimir(2)} className="flex-1">
                  Doble
                </Button>
              </div>
            </Modal>

            <div className="flex gap-2 pt-1">
              <Button size="md" onClick={() => setShowPrintOptions(true)} className="flex-1">
                Imprimir ticket
              </Button>
              <Button
                size="md"
                variant="secondary"
                onClick={() => setShowAgregarProductos(true)}
                className="flex-1"
              >
                <Plus size={15} className="mr-1" />
                Agregar
              </Button>
              <Button
                size="md"
                variant="danger"
                loading={mutCerrar.isPending}
                onClick={handleClickCerrar}
                className="flex-1"
              >
                Cerrar mesa
              </Button>
            </div>

            {showWarningCerrar && (
              <div className="rounded-xl border border-rubi/40 bg-rubi/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-rubi">¿Confirmar cierre de mesa?</p>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-tierra-muted">Total a cobrar</p>
                    <p className="text-lg font-bold text-bronceado">{fmt(totalFinal)}</p>
                    {pctNum > 0 && (
                      <p className="text-xs text-rubi">con {pctNum}% de desc.</p>
                    )}
                  </div>
                </div>
                {hayPendientes && (
                  <p className="text-xs text-tierra-muted">
                    Hay pedidos <span className="font-semibold text-tierra">pendientes</span> o <span className="font-semibold text-jade">listos</span> sin entregar. Se registrarán como entregados al cerrar.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowWarningCerrar(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={mutCerrar.isPending}
                    className="flex-1"
                    onClick={() => { setShowWarningCerrar(false); mutCerrar.mutate() }}
                  >
                    Cerrar mesa
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Ticket
        numeroTicket={numeroTicket}
        mesa={mesa}
        pedidos={pedidos}
        descuentoPorcentaje={pctNum}
        descuentoMotivo={motivo}
        subtotal={totales.subtotal}
        descuentoMonto={descMonto}
        total={totalFinal}
        fechaImpresion={new Date()}
      />

      <ModalAgregarProductos
        mesa={mesa}
        open={showAgregarProductos}
        onClose={() => setShowAgregarProductos(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['recepcion-pedidos-mesa', mesa.id] })
          queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
        }}
      />
    </>
  )
}

export function MesasEnVivo() {
  const queryClient = useQueryClient()
  const [selectedMesaId, setSelectedMesaId] = useState<string | null>(null)
  const [mesaAAbrir, setMesaAAbrir] = useState<Mesa | null>(null)
  const selectedMesaIdRef = useRef<string | null>(null)
  useEffect(() => { selectedMesaIdRef.current = selectedMesaId }, [selectedMesaId])

  const handleClickMesa = (mesa: Mesa) => {
    if (mesa.estado === 'libre') {
      setMesaAAbrir(mesa)
    } else {
      setSelectedMesaId(mesa.id)
    }
  }

  const { data: mesas = [], isLoading } = useQuery<Mesa[]>({
    queryKey: ['recepcion-mesas'],
    queryFn: getMesasParaRecepcion,
  })

  // Se deriva de la query para que se actualice automáticamente con cambios realtime
  const selectedMesa = mesas.find(m => m.id === selectedMesaId) ?? null

  useEffect(() => {
    const channel = supabase
      .channel('recepcion-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['recepcion-mesas'] })
        if (selectedMesaIdRef.current) {
          queryClient.invalidateQueries({ queryKey: ['recepcion-pedidos-mesa', selectedMesaIdRef.current] })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const categorias = [...new Set(mesas.map((m) => m.categoria).filter(Boolean))] as string[]
  const libres = mesas.filter((m) => m.estado === 'libre').length
  const ocupadas = mesas.filter((m) => m.estado !== 'libre').length

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-tierra-light mb-1">Mesas en Vivo</h1>
        <p className="text-sm text-tierra-muted">
          {ocupadas} ocupada{ocupadas !== 1 ? 's' : ''} · {libres} libre{libres !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-bronceado border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {categorias.length > 0 ? (
            categorias.map((cat) => {
              const mesasCat = mesas.filter((m) => m.categoria === cat)
              return (
                <div key={cat}>
                  <h2 className="font-heading text-sm text-tierra-muted uppercase tracking-wider mb-3">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {mesasCat.map((mesa) => (
                      <MesaCard key={mesa.id} mesa={mesa} onClick={() => handleClickMesa(mesa)} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {mesas.map((mesa) => (
                <MesaCard key={mesa.id} mesa={mesa} onClick={() => handleClickMesa(mesa)} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedMesa && (
        <ModalDetalleMesa
          mesa={selectedMesa}
          open={!!selectedMesa}
          onClose={() => setSelectedMesaId(null)}
        />
      )}

      {mesaAAbrir && (
        <ModalAbrirMesa
          mesa={mesaAAbrir}
          open={!!mesaAAbrir}
          onClose={() => setMesaAAbrir(null)}
        />
      )}
    </div>
  )
}
