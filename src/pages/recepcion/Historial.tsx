import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, Printer, LayoutGrid, Check } from 'lucide-react'
import { getHistorialPedidos, calcularTotalPedidos, aplicarDescuentoAPedidos, type FiltrosHistorial } from '@/services/recepcion'
import { getMesas } from '@/services/tables'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Ticket } from '@/components/print/Ticket'
import type { Mesa, Pedido } from '@/types'
import { clsx } from 'clsx'

const ESTADO_LABEL: Record<string, string> = {
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

// Un ticket agrupa todos los pedidos de una sesión de mesa
type TicketGroup = {
  numero_ticket: number
  fecha: string
  mesa?: Mesa
  cliente: string
  mozos: string
  items_resumen: string
  subtotal: number
  descuento_porcentaje: number
  descuento_motivo: string
  total: number
  estado: string
  pedidos: Pedido[]
}

// Agrupa pedidos por sesión: misma mesa + mismo cliente + mismo día.
// Esto es robusto aunque cada pedido tenga un numero_ticket distinto en la BD.
function agruparPorSesion(pedidos: Pedido[], filtroTicket?: string): TicketGroup[] {
  const map = new Map<string, Pedido[]>()

  for (const p of pedidos) {
    const dia = new Date(p.created_at).toISOString().slice(0, 10) // YYYY-MM-DD
    const cliente = (p.cliente ?? p.mesa?.cliente ?? '').trim() || '__sin_cliente__'
    const clave = `${p.mesa_id}|${cliente}|${dia}`
    if (!map.has(clave)) map.set(clave, [])
    map.get(clave)!.push(p)
  }

  let grupos = Array.from(map.values()).map((pedidosGrupo) => {
    const sorted = [...pedidosGrupo].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    // Usa el ticket más bajo del grupo como número representativo del ticket
    const minTicket = pedidosGrupo.reduce(
      (min, p) => Math.min(min, p.numero_ticket ?? Infinity),
      Infinity
    )
    const allItems = pedidosGrupo.flatMap(p => p.items ?? [])
    const subtotal = allItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
    const descPct = pedidosGrupo[0]?.descuento_porcentaje ?? 0
    const descMotivo = pedidosGrupo[0]?.descuento_motivo ?? ''
    const total = subtotal * (1 - descPct / 100)
    const mozos = [...new Set(pedidosGrupo.map(p => p.mozo?.nombre).filter(Boolean))].join(', ')
    const itemsResumen = allItems
      .map(i => `${i.producto?.nombre ?? '?'} x${i.cantidad}`)
      .join(', ')
      .slice(0, 50)
    const todosCancelados = pedidosGrupo.every(p => p.estado === 'cancelado')

    return {
      numero_ticket: isFinite(minTicket) ? minTicket : 0,
      fecha: sorted[0].created_at,
      mesa: sorted[0].mesa,
      cliente: sorted[0].cliente ?? sorted[0].mesa?.cliente ?? '-',
      mozos,
      items_resumen: itemsResumen,
      subtotal,
      descuento_porcentaje: descPct,
      descuento_motivo: descMotivo,
      total,
      estado: todosCancelados ? 'cancelado' : 'entregado',
      pedidos: sorted,
    }
  })

  // Filtro de ticket aplicado sobre los grupos (client-side)
  if (filtroTicket) {
    const ticketNum = parseInt(filtroTicket)
    if (!isNaN(ticketNum)) {
      grupos = grupos.filter(g =>
        g.numero_ticket === ticketNum ||
        g.pedidos.some(p => p.numero_ticket === ticketNum)
      )
    }
  }

  return grupos.sort((a, b) => b.numero_ticket - a.numero_ticket)
}

// ── Modal detalle de ticket ──────────────────────────────────────────────────

const MOTIVOS = ['Efectivo', 'Cortesía', 'Empleado', 'Otro']

function ModalDetalleTicket({
  grupo,
  open,
  onClose,
}: {
  grupo: TicketGroup
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [descPct, setDescPct] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [descuentoAplicado, setDescuentoAplicado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sinDescuento = grupo.descuento_porcentaje === 0

  const pctNum = parseFloat(descPct) || 0
  const totales = calcularTotalPedidos(grupo.pedidos)
  const descMonto = (totales.subtotal * pctNum) / 100
  const totalFinal = totales.subtotal - descMonto

  const mutDescuento = useMutation({
    mutationFn: () => aplicarDescuentoAPedidos(
      grupo.pedidos.map((p) => p.id),
      pctNum,
      motivo.toLowerCase()
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recepcion-historial'] })
      setDescuentoAplicado(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDescuentoAplicado(false), 2000)
    },
  })

  const fmt = (n: number) =>
    '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={grupo.mesa?.nombre ?? '-'}
        subtitle={grupo.cliente !== '-' ? grupo.cliente : undefined}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Ticket number */}
          <div className="flex items-center gap-2 pb-1 border-b border-tierra/10">
            <span className="text-xs text-tierra-muted">Ticket</span>
            <span className="font-mono font-bold text-bronceado text-base">
              #{grupo.numero_ticket}
            </span>
          </div>

          {/* Pedidos individuales */}
          {grupo.pedidos.map((pedido) => {
            const pedidoTotal = (pedido.items ?? []).reduce(
              (s, i) => s + i.cantidad * i.precio_unitario,
              0
            )
            return (
              <div key={pedido.id} className="bg-windsor-lighter rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-tierra-muted">
                    {pedido.mozo?.nombre} ·{' '}
                    {new Date(pedido.created_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={clsx(
                      'text-xs font-bold px-2 py-0.5 rounded-lg border',
                      pedido.estado === 'pendiente' && 'text-tierra bg-tierra/10 border-tierra/20',
                      pedido.estado === 'en_preparacion' && 'text-bronceado bg-bronceado/10 border-bronceado/30',
                      pedido.estado === 'listo' && 'text-jade bg-jade/15 border-jade/40 animate-pulse',
                      pedido.estado === 'entregado' && 'text-tierra-muted bg-windsor-card border-tierra/15',
                      pedido.estado === 'cancelado' && 'text-rubi-light bg-rubi/20 border-rubi/40',
                    )}
                  >
                    {pedido.estado.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-1">
                  {(pedido.items ?? []).map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-tierra">
                        {item.producto?.nombre} x{item.cantidad}
                      </span>
                      <span className="text-tierra-muted">
                        {fmt(item.cantidad * item.precio_unitario)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-tierra/10">
                  <span className="text-tierra-muted">Subtotal</span>
                  <span className="text-tierra-light">{fmt(pedidoTotal)}</span>
                </div>
              </div>
            )
          })}

          {/* Totales del ticket */}
          <div className="card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-tierra-muted">Subtotal general</span>
              <span className="text-tierra-light">{fmt(totales.subtotal)}</span>
            </div>
            {totales.descuentoPct > 0 && (
              <div className="flex justify-between text-sm text-rubi">
                <span>
                  Descuento {totales.descuentoPct}%
                  {totales.motivo ? ` (${totales.motivo})` : ''}
                </span>
                <span>-{fmt(totales.descuentoMonto)}</span>
              </div>
            )}
            {sinDescuento && pctNum > 0 && (
              <div className="flex justify-between text-sm text-rubi">
                <span>Descuento {pctNum}%</span>
                <span>-{fmt(descMonto)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-tierra/10">
              <span className="text-tierra">TOTAL</span>
              <span className="text-bronceado">{fmt(sinDescuento ? totalFinal : totales.total)}</span>
            </div>

            {sinDescuento && (
              <div className="pt-2 border-t border-tierra/10 space-y-2">
                <p className="text-xs text-tierra-muted">Aplicar descuento</p>
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
                    disabled={mutDescuento.isPending || pctNum <= 0}
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
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="md" onClick={() => window.print()} className="flex-1">
              <Printer size={16} className="mr-2" />
              Imprimir
            </Button>
            <Button size="md" variant="secondary" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {grupo.mesa && (
        <Ticket
          numeroTicket={grupo.numero_ticket}
          mesa={grupo.mesa}
          pedidos={grupo.pedidos}
          descuentoPorcentaje={totales.descuentoPct}
          descuentoMotivo={totales.motivo}
          subtotal={totales.subtotal}
          descuentoMonto={totales.descuentoMonto}
          total={totales.total}
          fechaImpresion={new Date()}
        />
      )}
    </>
  )
}

// ── Selector de mesa ─────────────────────────────────────────────────────────

function ModalSelectorMesa({
  open,
  onClose,
  onSelect,
  selectedId,
}: {
  open: boolean
  onClose: () => void
  onSelect: (id: string, nombre: string) => void
  selectedId?: string
}) {
  const { data: mesas = [], isLoading } = useQuery<Mesa[]>({
    queryKey: ['mesas-selector'],
    queryFn: getMesas,
    enabled: open,
  })

  const categorias = [...new Set(mesas.map((m) => m.categoria).filter(Boolean))] as string[]
  const sinCategoria = mesas.filter((m) => !m.categoria)

  const MesaBtn = ({ mesa }: { mesa: Mesa }) => (
    <button
      key={mesa.id}
      onClick={() => { onSelect(mesa.id, mesa.nombre); onClose() }}
      className={clsx(
        'card p-2 text-center text-xs font-bold transition-all',
        selectedId === mesa.id
          ? 'border border-bronceado/70 text-bronceado'
          : 'text-tierra hover:border-bronceado/30 cursor-pointer'
      )}
    >
      {mesa.nombre}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title="Seleccionar mesa" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-2 border-bronceado border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-1">
          {categorias.map((cat) => (
            <div key={cat}>
              <p className="text-xs text-tierra-muted uppercase tracking-wider font-bold mb-2">{cat}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {mesas.filter((m) => m.categoria === cat).map((mesa) => (
                  <MesaBtn key={mesa.id} mesa={mesa} />
                ))}
              </div>
            </div>
          ))}
          {sinCategoria.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {sinCategoria.map((mesa) => <MesaBtn key={mesa.id} mesa={mesa} />)}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Historial principal ──────────────────────────────────────────────────────

export function Historial() {
  const [selectedGrupo, setSelectedGrupo] = useState<TicketGroup | null>(null)
  const [filtros, setFiltros] = useState<FiltrosHistorial>({})
  const [cliente, setCliente] = useState('')
  const [numeroTicket, setNumeroTicket] = useState('')
  const [mesaId, setMesaId] = useState('')
  const [mesaNombre, setMesaNombre] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showModalMesas, setShowModalMesas] = useState(false)

  const activeFiltros: FiltrosHistorial = {
    cliente: cliente || undefined,
    numeroTicket: numeroTicket || undefined,
    mesaId: mesaId || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  }

  const { data: pedidos = [], isLoading } = useQuery<Pedido[]>({
    queryKey: ['recepcion-historial', filtros],
    queryFn: () => getHistorialPedidos(filtros),
  })

  const ticketGroups = useMemo(
    () => agruparPorSesion(pedidos, filtros.numeroTicket),
    [pedidos, filtros.numeroTicket]
  )

  const handleBuscar = () => setFiltros(activeFiltros)

  const handleLimpiar = () => {
    setCliente('')
    setNumeroTicket('')
    setMesaId('')
    setMesaNombre('')
    setDesde('')
    setHasta('')
    setFiltros({})
  }

  const fmt = (n: number) =>
    '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const tienesFiltros = cliente || numeroTicket || mesaId || desde || hasta

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-tierra-light mb-1">Historial</h1>
        <p className="text-sm text-tierra-muted">Un ticket por estadía de mesa</p>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[10px] text-tierra-muted uppercase tracking-wide mb-1 block">Mesa</label>
            <button
              type="button"
              onClick={() => setShowModalMesas(true)}
              className={clsx(
                'input-field w-full text-left flex items-center justify-between gap-2',
                mesaNombre ? 'text-tierra-light' : 'text-tierra-muted'
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <LayoutGrid size={14} className="shrink-0" />
                <span className="truncate">{mesaNombre || 'Todas'}</span>
              </span>
              {mesaNombre && (
                <X
                  size={13}
                  className="shrink-0 hover:text-rubi"
                  onClick={(e) => { e.stopPropagation(); setMesaId(''); setMesaNombre('') }}
                />
              )}
            </button>
          </div>
          <div>
            <label className="text-[10px] text-tierra-muted uppercase tracking-wide mb-1 block">Cliente</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-muted" />
              <input
                type="text"
                placeholder="Nombre..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="input-field w-full pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-tierra-muted uppercase tracking-wide mb-1 block">N° Ticket</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tierra-muted" />
              <input
                type="number"
                placeholder="0"
                value={numeroTicket}
                onChange={(e) => setNumeroTicket(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="input-field w-full pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-tierra-muted uppercase tracking-wide mb-1 block">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="text-[10px] text-tierra-muted uppercase tracking-wide mb-1 block">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleBuscar}>Buscar</Button>
          {tienesFiltros && (
            <Button size="sm" variant="ghost" onClick={handleLimpiar}>
              <X size={14} className="mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-bronceado border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ticketGroups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-tierra-muted text-base">Sin resultados</p>
          <p className="text-tierra-muted text-sm mt-1">Probá con otros filtros</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tierra/10">
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase">N° Ticket</th>
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase">Mesa</th>
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase hidden sm:table-cell">Mozos</th>
                  <th className="text-left px-4 py-3 text-xs text-tierra-muted font-bold uppercase hidden sm:table-cell">Items</th>
                  <th className="text-right px-4 py-3 text-xs text-tierra-muted font-bold uppercase">Total</th>
                  <th className="text-right px-4 py-3 text-xs text-tierra-muted font-bold uppercase hidden sm:table-cell">Desc.</th>
                  <th className="text-center px-4 py-3 text-xs text-tierra-muted font-bold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ticketGroups.map((grupo) => (
                  <tr
                    key={grupo.numero_ticket}
                    onClick={() => setSelectedGrupo(grupo)}
                    className="border-b border-tierra/5 hover:bg-windsor-lighter cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-tierra font-mono">
                      #{String(grupo.numero_ticket).padStart(5, '0')}
                    </td>
                    <td className="px-4 py-3 text-tierra-muted whitespace-nowrap">
                      {new Date(grupo.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-tierra">
                      {grupo.mesa?.nombre ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-tierra">{grupo.cliente}</td>
                    <td className="px-4 py-3 text-tierra hidden sm:table-cell whitespace-nowrap">
                      {grupo.mozos}
                    </td>
                    <td className="px-4 py-3 text-tierra-muted hidden sm:table-cell max-w-[180px] truncate">
                      {grupo.items_resumen || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-bronceado font-bold">
                      {fmt(grupo.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-tierra-muted hidden sm:table-cell">
                      {grupo.descuento_porcentaje > 0 ? `${grupo.descuento_porcentaje}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-bold',
                          grupo.estado === 'entregado'
                            ? 'bg-jade/15 text-jade'
                            : 'bg-rubi/20 text-rubi'
                        )}
                      >
                        {ESTADO_LABEL[grupo.estado] ?? grupo.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-tierra/10">
            <p className="text-xs text-tierra-muted">
              {ticketGroups.length} ticket{ticketGroups.length !== 1 ? 's' : ''}
              {' '}({pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''})
            </p>
          </div>
        </div>
      )}

      <ModalSelectorMesa
        open={showModalMesas}
        onClose={() => setShowModalMesas(false)}
        onSelect={(id, nombre) => { setMesaId(id); setMesaNombre(nombre) }}
        selectedId={mesaId}
      />

      {selectedGrupo && (
        <ModalDetalleTicket
          grupo={selectedGrupo}
          open={!!selectedGrupo}
          onClose={() => setSelectedGrupo(null)}
        />
      )}
    </div>
  )
}
