import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPedidosForMesas } from '@/services/orders'
import { getMesas, cerrarMesa, pedirCuenta, cancelarCuenta, transferirMesasAlMozo, transferirMesasEspecificas, migrarMesa, updateMesa } from '@/services/tables'
import { getAllProfiles } from '@/services/users'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimePedidos } from '@/hooks/useRealtime'
import { useNotificaciones } from '@/contexts/NotificacionesContext'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ClipboardList, Clock, Plus, X, ChevronDown, ChevronUp, Timer, ChefHat, Users, ArrowRightLeft, Check, ChevronRight, ChevronLeft, Pencil } from 'lucide-react'
import type { Pedido } from '@/types'
import { clsx } from 'clsx'

function formatElapsed(from: string): string {
  const mins = Math.floor((Date.now() - new Date(from).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const PANEL_ORDER = ['cocina', 'postres', null] as const

function PedidoRow({ pedido }: { pedido: Pedido }) {
  const elapsed = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 60000)

  const groups = PANEL_ORDER
    .map((panel) => ({
      panel,
      items: pedido.items?.filter((i) => (i.producto?.panel ?? null) === panel) ?? [],
      panelEstado: panel
        ? pedido.panel_estados?.find((pe) => pe.panel === panel)
        : null,
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="bg-windsor-lighter rounded-xl p-3">
      <div className="flex justify-end mb-2">
        <span className="text-tierra-muted text-xs flex items-center gap-1">
          <Clock size={10} /> {elapsed}m
        </span>
      </div>

      {groups.map((group, idx) => (
        <div key={group.panel ?? 'sin-panel'}>
          {idx > 0 && <div className="border-t border-tierra/10 my-2" />}
          {group.panelEstado && (
            <StatusBadge
              status={group.panelEstado.estado}
              className="!px-1.5 !py-0.5 !text-[10px] !rounded mb-1.5"
            />
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-bronceado font-bold w-5 flex-shrink-0">{item.cantidad}x</span>
                <span className="text-tierra flex-1">{item.producto?.nombre}</span>
                {item.notas && (
                  <span className="text-tierra-muted text-xs italic">({item.notas})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {pedido.notas && (
        <p className="mt-2 text-tierra-muted text-xs italic bg-windsor-card rounded-lg px-3 py-1.5">
          {pedido.notas}
        </p>
      )}
    </div>
  )
}

export function MisPedidos() {
  const { user }     = useAuth()
  const navigate      = useNavigate()
  const location      = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient   = useQueryClient()
  const { acknowledge, acknowledgeTransferencias } = useNotificaciones()

  useEffect(() => {
    acknowledgeTransferencias()
  }, [])

  const [expandedMesa,     setExpandedMesa]     = useState<string | null>(null)
  const [closingMesa,      setClosingMesa]      = useState<string | null>(null)
  const [cuentaMesa,       setCuentaMesa]       = useState<string | null>(null)
  const [confirmCuenta,    setConfirmCuenta]    = useState<string | null>(null)
  const [confirmLiberar,   setConfirmLiberar]   = useState<string | null>(null)
  const [deshaciendo,      setDeshaciendo]      = useState<string | null>(null)

  // Pasar mesas a un compañero
  const [modalTransferir,    setModalTransferir]    = useState(false)
  const [pasoTransferir,     setPasoTransferir]     = useState<'mesas' | 'mozo'>('mesas')
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState<string[]>([])
  const [transferiendoA,     setTransfiriendoA]     = useState<string | null>(null)
  const [transfiriendo,      setTransfiriendo]      = useState(false)

  // Editar cliente
  const [editandoCliente, setEditandoCliente] = useState<string | null>(null)
  const [clienteEdit,     setClienteEdit]     = useState('')
  const [savingCliente,   setSavingCliente]   = useState(false)

  const handleGuardarCliente = async (mesaId: string) => {
    if (!clienteEdit.trim()) return
    setSavingCliente(true)
    try {
      await updateMesa(mesaId, { cliente: clienteEdit.trim() })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      setEditandoCliente(null)
    } finally {
      setSavingCliente(false)
    }
  }

  // Migrar una mesa a otra habitación
  const [modalMigrar, setModalMigrar] = useState<string | null>(null)
  const [migrandoA,   setMigrandoA]   = useState<string | null>(null)
  const [migrando,    setMigrando]    = useState(false)

  useEffect(() => {
    const mesaId = (location.state as any)?.mesaId ?? searchParams.get('mesa')
    if (mesaId) {
      setExpandedMesa(mesaId)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.getElementById(`mesa-${mesaId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }))
    }
  }, [location.state, searchParams])

  const { data: mesas } = useQuery({
    queryKey: ['mesas'],
    queryFn: getMesas,
  })

  // Mesas activas del mozo actual — fuente de verdad para qué pedidos mostrar
  const misMesas = mesas?.filter(m => m.mozo_activo_id === user?.id) ?? []
  const misMesaIds = misMesas.map(m => m.id)

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['mis-pedidos', misMesaIds],
    queryFn: () => getPedidosForMesas(misMesas.map(m => ({ id: m.id, abierta_at: m.abierta_at }))),
    enabled: !!user && mesas !== undefined,
    refetchInterval: 15000,
  })

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: getAllProfiles,
  })

  const mozosCompañeros = profiles?.filter(p => p.rol === 'mozo' && p.activo && p.id !== user?.id) ?? []

  useRealtimePedidos({
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] }),
  })

  const handlePedirCuenta = (mesaId: string, pedidosMesa: Pedido[]) => {
    const tieneActivos = pedidosMesa.some(
      p => p.estado === 'pendiente' || p.estado === 'en_preparacion'
    )
    if (tieneActivos) {
      setConfirmCuenta(mesaId)
    } else {
      doPedirCuenta(mesaId)
    }
  }

  const doPedirCuenta = async (mesaId: string) => {
    setConfirmCuenta(null)
    setCuentaMesa(mesaId)
    try {
      await pedirCuenta(mesaId)
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    } finally {
      setCuentaMesa(null)
    }
  }

  const handleDeshacerCuenta = async (mesaId: string) => {
    setDeshaciendo(mesaId)
    try {
      await cancelarCuenta(mesaId)
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    } finally {
      setDeshaciendo(null)
    }
  }

  const handleCerrar = async (mesaId: string) => {
    setClosingMesa(mesaId)
    try {
      await cerrarMesa(mesaId)
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] })
      if (expandedMesa === mesaId) setExpandedMesa(null)
    } finally {
      setClosingMesa(null)
    }
  }

  const abrirModalTransferir = () => {
    setMesasSeleccionadas(misMesas.map(m => m.id))
    setPasoTransferir('mesas')
    setTransfiriendoA(null)
    setModalTransferir(true)
  }

  const cerrarModalTransferir = () => {
    setModalTransferir(false)
    setPasoTransferir('mesas')
    setMesasSeleccionadas([])
    setTransfiriendoA(null)
  }

  const toggleMesa = (id: string) =>
    setMesasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const toggleTodas = () =>
    setMesasSeleccionadas(
      mesasSeleccionadas.length === misMesas.length ? [] : misMesas.map(m => m.id)
    )

  const handleTransferir = async () => {
    if (!user || !transferiendoA || mesasSeleccionadas.length === 0) return
    setTransfiriendo(true)
    try {
      if (mesasSeleccionadas.length === misMesas.length) {
        await transferirMesasAlMozo(user.id, transferiendoA)
      } else {
        await transferirMesasEspecificas(mesasSeleccionadas, transferiendoA)
      }
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] })
      cerrarModalTransferir()
    } finally {
      setTransfiriendo(false)
    }
  }

  const handleMigrar = async () => {
    if (!user || !modalMigrar || !migrandoA) return
    const mesaOrigen = mesas?.find(m => m.id === modalMigrar)
    if (!mesaOrigen) return
    setMigrando(true)
    try {
      await migrarMesa(
        modalMigrar,
        migrandoA,
        user.id,
        mesaOrigen.cliente ?? null,
        mesaOrigen.estado,
        mesaOrigen.abierta_at ?? null
      )
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] })
      if (expandedMesa === modalMigrar) setExpandedMesa(null)
      setModalMigrar(null)
      setMigrandoA(null)
    } finally {
      setMigrando(false)
    }
  }

  // Pedidos agrupados por mesa
  const porMesa = pedidos?.reduce<Record<string, Pedido[]>>((acc, p) => {
    if (!acc[p.mesa_id]) acc[p.mesa_id] = []
    acc[p.mesa_id].push(p)
    return acc
  }, {}) ?? {}

  // Mesas libres disponibles para migrar (excluye la que se está moviendo)
  const mesasLibres = mesas?.filter(m => m.estado === 'libre' && m.id !== modalMigrar) ?? []

  // Solo mesas donde soy el mozo activo (fuente única de verdad)
  const todasIds = misMesas
    .map(m => m.id)
    .sort((a, b) => {
      const mA = mesas?.find(m => m.id === a)
      const mB = mesas?.find(m => m.id === b)
      if (mA?.estado === 'cuenta' && mB?.estado !== 'cuenta') return -1
      if (mA?.estado !== 'cuenta' && mB?.estado === 'cuenta') return 1
      const tA = mA?.abierta_at ? new Date(mA.abierta_at).getTime() : Infinity
      const tB = mB?.abierta_at ? new Date(mB.abierta_at).getTime() : Infinity
      return tA - tB
    })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in pb-6">
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-tierra-light mb-1">Mis mesas</h2>
        <p className="text-tierra-muted text-sm">Tocá una mesa para ver el detalle</p>
      </div>

      {todasIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-windsor-lighter flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-tierra-muted" />
          </div>
          <p className="text-tierra-muted">No tenés mesas activas</p>
          <p className="text-tierra-muted text-sm mt-1">Seleccioná una mesa libre para empezar</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {todasIds.map((mesaId) => {
              const pedidosMesa    = porMesa[mesaId] ?? []
              const mesaInfo       = mesas?.find(m => m.id === mesaId) ?? pedidosMesa[0]?.mesa
              const esmiMesa       = misMesas.some(m => m.id === mesaId)
              const expanded       = expandedMesa === mesaId
              const estadoMesa     = mesas?.find(m => m.id === mesaId)?.estado
              const tieneListos     = pedidosMesa.some(p => p.estado === 'listo')
              const pendientesCount = pedidosMesa.filter(p => p.estado === 'en_preparacion').length
              const pendienteCount  = pedidosMesa.filter(p => p.estado === 'pendiente').length

              return (
                <div key={mesaId} id={`mesa-${mesaId}`} className="card overflow-hidden">
                  {/* Header — siempre visible, click expande */}
                  <button
                    className={clsx(
                      'w-full flex flex-col px-5 py-4 transition-colors text-left',
                      tieneListos
                        ? 'bg-jade/5 hover:bg-jade/10'
                        : estadoMesa === 'cuenta'
                          ? 'bg-rubi/10 hover:bg-rubi/15'
                          : 'hover:bg-windsor-lighter/50'
                    )}
                    onClick={() => {
                      if (!expanded && tieneListos) acknowledge(mesaId)
                      setExpandedMesa(expanded ? null : mesaId)
                    }}
                  >
                    {/* Sección superior: nombre + timer */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col items-start min-w-0">
                        <span className={clsx(
                          'font-heading text-xl font-bold leading-tight',
                          tieneListos ? 'text-jade' : estadoMesa === 'cuenta' ? 'text-rubi-light' : 'text-tierra-light'
                        )}>
                          {mesaInfo?.nombre ?? `Mesa ${mesaInfo?.numero}`}
                        </span>
                        {mesaInfo?.cliente && (
                          <span className="text-tierra-muted text-xs truncate">
                            {mesaInfo.cliente}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const desde = mesaInfo?.abierta_at ?? pedidosMesa[0]?.created_at
                        if (!desde) return null
                        return (
                          <span className={clsx(
                            'flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold flex-shrink-0 ml-2',
                            estadoMesa === 'cuenta'
                              ? 'text-rubi-light bg-rubi/20'
                              : 'text-tierra-muted bg-windsor-lighter'
                          )}>
                            <Timer size={11} />
                            {formatElapsed(desde)}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-tierra/10 mb-3" />

                    {/* Sección inferior: badges de estado + chevron */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {tieneListos && (
                          <span className="flex items-center gap-1 text-xs font-bold text-jade bg-jade/15 border border-jade/40 px-2 py-0.5 rounded-lg animate-pulse">
                            <ChefHat size={10} /> LISTO
                          </span>
                        )}
                        {estadoMesa === 'cuenta' && (
                          <span className="text-xs font-bold text-rubi-light bg-rubi/20 border border-rubi/40 px-2 py-0.5 rounded-lg animate-pulse">
                            CUENTA
                          </span>
                        )}
                        {pendientesCount > 0 && (
                          <span className="text-xs font-bold text-bronceado bg-bronceado/10 border border-bronceado/30 px-2 py-0.5 rounded-lg">
                            {pendientesCount} en prep.
                          </span>
                        )}
                        {pendienteCount > 0 && (
                          <span className="text-xs font-bold text-tierra bg-tierra/10 border border-tierra/20 px-2 py-0.5 rounded-lg">
                            {pendienteCount} pendiente{pendienteCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {!tieneListos && estadoMesa !== 'cuenta' && pendientesCount === 0 && pendienteCount === 0 && (
                          <span className="text-xs text-tierra-muted">Sin pedidos activos</span>
                        )}
                      </div>
                      {expanded
                        ? <ChevronUp size={16} className="text-tierra-muted flex-shrink-0" />
                        : <ChevronDown size={16} className="text-tierra-muted flex-shrink-0" />
                      }
                    </div>
                  </button>

                  {/* Detalle expandible */}
                  {expanded && (
                    <div className="px-5 pb-5 border-t border-tierra/10 pt-4 animate-fade-in">

                      {/* Cliente y total */}
                      {(mesaInfo?.cliente || pedidosMesa.length > 0) && (
                        <div className="flex items-center justify-between bg-windsor-lighter rounded-xl px-4 py-3 mb-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-tierra-muted text-xs mb-0.5">Cliente</p>
                            {editandoCliente === mesaId ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={clienteEdit}
                                  onChange={e => setClienteEdit(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleGuardarCliente(mesaId)
                                    if (e.key === 'Escape') setEditandoCliente(null)
                                  }}
                                  className="bg-windsor-card border border-tierra/20 rounded-lg px-2 py-1 text-sm text-tierra font-bold focus:outline-none focus:border-bronceado/50 w-40"
                                />
                                <button onClick={() => handleGuardarCliente(mesaId)} disabled={savingCliente}
                                  className="text-jade hover:text-jade-light transition-colors">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditandoCliente(null)}
                                  className="text-tierra-muted hover:text-tierra transition-colors">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-tierra font-bold text-sm truncate">
                                {mesaInfo?.cliente ?? '—'}
                              </p>
                            )}
                          </div>
                          {editandoCliente !== mesaId && (
                            <button
                              onClick={() => { setEditandoCliente(mesaId); setClienteEdit(mesaInfo?.cliente ?? '') }}
                              className="ml-3 p-2 rounded-lg text-tierra-muted hover:text-bronceado hover:bg-windsor-card transition-colors flex-shrink-0"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Pedidos actuales */}
                      {pedidosMesa.length > 0 ? (
                        <div className="space-y-3 mb-4">
                          {pedidosMesa.map((p) => (
                            <PedidoRow key={p.id} pedido={p} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-tierra-muted text-sm text-center py-4 mb-4 bg-windsor-lighter rounded-xl">
                          Habitación abierta — sin pedidos todavía
                        </p>
                      )}

                      {/* Total */}
                      {pedidosMesa.length > 0 && (
                        <div className="flex items-center justify-between bg-windsor-lighter rounded-xl px-4 py-3 mb-2">
                          <p className="text-tierra-muted text-sm">Total consumido</p>
                          <p className="font-heading text-xl text-bronceado">
                            ${pedidosMesa.reduce((acc, p) =>
                              acc + (p.items?.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) ?? 0), 0
                            ).toFixed(2)}
                          </p>
                        </div>
                      )}

                      {/* Acciones según estado */}
                      {esmiMesa && (() => {
                        const esCuenta = estadoMesa === 'cuenta'

                        return (
                          <div className="flex flex-col gap-2">
                            {!esCuenta && (
                              <Button
                                size="lg"
                                className="w-full"
                                onClick={() => navigate(`/mozo/mesa/${mesaId}/nuevo-pedido`)}
                              >
                                <Plus size={16} className="mr-2" />
                                Agregar productos
                              </Button>
                            )}

                            {esCuenta ? (
                              /* En estado CUENTA */
                              <>
                                <button
                                  disabled={!!deshaciendo}
                                  onClick={() => handleDeshacerCuenta(mesaId)}
                                  className="w-full py-3 rounded-xl bg-bronceado/15 border border-bronceado/40 text-bronceado font-bold text-sm flex items-center justify-center gap-2 hover:bg-bronceado/25 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  {deshaciendo === mesaId
                                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : '↩ Seguir pidiendo'
                                  }
                                </button>
                                <Button
                                  variant="danger"
                                  size="lg"
                                  className="w-full"
                                  loading={closingMesa === mesaId}
                                  onClick={() => setConfirmLiberar(mesaId)}
                                >
                                  <X size={16} className="mr-1" />
                                  Liberar mesa
                                </Button>
                              </>
                            ) : (
                              /* Ocupada: pedir cuenta */
                              <button
                                disabled={cuentaMesa === mesaId}
                                onClick={() => handlePedirCuenta(mesaId, pedidosMesa)}
                                className="w-full py-3 rounded-xl bg-rubi/20 border border-rubi/40 text-rubi-light font-bold text-sm flex items-center justify-center gap-2 hover:bg-rubi/30 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {cuentaMesa === mesaId
                                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : '● Pedir cuenta'
                                }
                              </button>
                            )}

                            {/* Cambiar habitación */}
                            <button
                              onClick={() => { setModalMigrar(mesaId); setMigrandoA(null) }}
                              className="w-full py-2.5 rounded-xl bg-windsor-lighter border border-tierra/20 text-tierra-muted font-bold text-sm flex items-center justify-center gap-2 hover:bg-windsor-card hover:text-tierra active:scale-95 transition-all"
                            >
                              <ArrowRightLeft size={14} />
                              Cambiar habitación
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pasar mesas a un compañero */}
          <div className="mt-6 pt-4 border-t border-tierra/10">
            <button
              onClick={abrirModalTransferir}
              className="w-full py-3 rounded-xl bg-windsor-lighter border border-tierra/20 text-tierra-muted font-bold text-sm flex items-center justify-center gap-2 hover:bg-windsor-card hover:text-tierra active:scale-95 transition-all"
            >
              <Users size={16} />
              Pasar mesas
            </button>
          </div>
        </>
      )}

      {/* Modal: confirmación pedir cuenta con pedidos activos */}
      <Modal
        open={!!confirmCuenta}
        onClose={() => setConfirmCuenta(null)}
        title="Hay pedidos en proceso"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-tierra text-sm">
            Esta mesa tiene pedidos <span className="font-bold text-bronceado">pendientes o en preparación</span>. ¿Querés pedir la cuenta de todas formas?
          </p>
          <p className="text-tierra-muted text-xs">
            Los pedidos que aún no llegaron seguirán en cocina.
          </p>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setConfirmCuenta(null)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => doPedirCuenta(confirmCuenta!)}
              className="flex-1"
            >
              Pedir cuenta igual
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: pasar mesas — paso 1: elegir mesas */}
      <Modal
        open={modalTransferir && pasoTransferir === 'mesas'}
        onClose={cerrarModalTransferir}
        title="Pasar mesas"
        size="sm"
      >
        <p className="text-tierra-muted text-sm mb-3">¿Qué mesas querés pasar?</p>

        <div className="space-y-1.5 mb-5 max-h-64 overflow-y-auto">
          {/* Todas */}
          <button
            onClick={toggleTodas}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
              mesasSeleccionadas.length === misMesas.length
                ? 'bg-bronceado/15 border-bronceado/50 text-tierra'
                : 'bg-windsor-lighter border-tierra/20 text-tierra-muted hover:border-tierra/40 hover:text-tierra'
            )}
          >
            <span className={clsx(
              'w-5 h-5 rounded flex items-center justify-center border flex-shrink-0',
              mesasSeleccionadas.length === misMesas.length
                ? 'bg-bronceado border-bronceado'
                : 'border-tierra/30'
            )}>
              {mesasSeleccionadas.length === misMesas.length && <Check size={12} className="text-windsor" />}
            </span>
            <span className="font-bold text-sm">Todas ({misMesas.length})</span>
          </button>

          <div className="border-t border-tierra/10 my-1" />

          {misMesas.map(mesa => {
            const sel = mesasSeleccionadas.includes(mesa.id)
            return (
              <button
                key={mesa.id}
                onClick={() => toggleMesa(mesa.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all',
                  sel
                    ? 'bg-bronceado/15 border-bronceado/50 text-tierra'
                    : 'bg-windsor-lighter border-tierra/20 text-tierra-muted hover:border-tierra/40 hover:text-tierra'
                )}
              >
                <span className={clsx(
                  'w-5 h-5 rounded flex items-center justify-center border flex-shrink-0',
                  sel ? 'bg-bronceado border-bronceado' : 'border-tierra/30'
                )}>
                  {sel && <Check size={12} className="text-windsor" />}
                </span>
                <div className="text-left min-w-0">
                  <p className="font-bold text-sm leading-tight">{mesa.nombre}</p>
                  {mesa.cliente && <p className="text-xs truncate opacity-70">{mesa.cliente}</p>}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={cerrarModalTransferir}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={mesasSeleccionadas.length === 0}
            onClick={() => setPasoTransferir('mozo')}
          >
            Siguiente
            <ChevronRight size={15} className="ml-1" />
          </Button>
        </div>
      </Modal>

      {/* Modal: pasar mesas — paso 2: elegir mozo */}
      <Modal
        open={modalTransferir && pasoTransferir === 'mozo'}
        onClose={cerrarModalTransferir}
        title="Pasar mesas"
        size="sm"
      >
        <p className="text-tierra-muted text-sm mb-1">
          ¿A quién le pasás {mesasSeleccionadas.length === 1 ? 'la mesa' : `las ${mesasSeleccionadas.length} mesas`}?
        </p>

        {mozosCompañeros.length === 0 ? (
          <p className="text-tierra-muted text-sm text-center py-4">No hay otros mozos activos</p>
        ) : (
          <div className="space-y-2 my-4">
            {mozosCompañeros.map(mozo => (
              <button
                key={mozo.id}
                onClick={() => setTransfiriendoA(mozo.id)}
                className={clsx(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                  transferiendoA === mozo.id
                    ? 'bg-bronceado/15 border-bronceado/50 text-tierra'
                    : 'bg-windsor-lighter border-tierra/20 text-tierra-muted hover:border-tierra/40 hover:text-tierra'
                )}
              >
                <span className="font-bold text-sm">{mozo.nombre}</span>
                {transferiendoA === mozo.id && (
                  <span className="w-4 h-4 rounded-full bg-bronceado flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-windsor" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-shrink-0" onClick={() => setPasoTransferir('mesas')}>
            <ChevronLeft size={15} className="mr-1" />
            Atrás
          </Button>
          <Button
            className="flex-1"
            loading={transfiriendo}
            disabled={!transferiendoA}
            onClick={handleTransferir}
          >
            Pasar {mesasSeleccionadas.length === 1 ? 'mesa' : 'mesas'}
          </Button>
        </div>
      </Modal>

      {/* Modal: confirmar liberar mesa */}
      <Modal
        open={!!confirmLiberar}
        onClose={() => setConfirmLiberar(null)}
        title="¿Liberar mesa?"
        size="sm"
      >
        {confirmLiberar && (() => {
          const pedidosMesa = porMesa[confirmLiberar] ?? []
          const totalMesa = pedidosMesa.reduce((acc, p) =>
            acc + (p.items?.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) ?? 0), 0
          )
          const mesaInfo = mesas?.find(m => m.id === confirmLiberar)
          return (
            <div className="space-y-4">
              <p className="text-tierra text-sm">
                <span className="font-bold">{mesaInfo?.nombre}</span>
                {mesaInfo?.cliente ? ` — ${mesaInfo.cliente}` : ''}
              </p>
              {totalMesa > 0 && (
                <div className="bg-windsor-lighter rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-tierra-muted text-sm">Total a cobrar</span>
                  <span className="font-heading text-xl text-bronceado">${totalMesa.toFixed(2)}</span>
                </div>
              )}
              <p className="text-tierra-muted text-xs">
                Esta acción libera la mesa y no puede deshacerse.
              </p>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setConfirmLiberar(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  loading={closingMesa === confirmLiberar}
                  onClick={() => {
                    const id = confirmLiberar
                    setConfirmLiberar(null)
                    handleCerrar(id)
                  }}
                  className="flex-1"
                >
                  Liberar mesa
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal: cambiar habitación — migrar una mesa */}
      <Modal
        open={!!modalMigrar}
        onClose={() => { setModalMigrar(null); setMigrandoA(null) }}
        title="Cambiar habitación"
        size="sm"
      >
        {(() => {
          const mesaOrigen = mesas?.find(m => m.id === modalMigrar)
          return (
            <>
              <p className="text-tierra-muted text-sm mb-1">
                Moviendo <span className="text-tierra font-bold">{mesaOrigen?.nombre}</span>
                {mesaOrigen?.cliente ? ` (${mesaOrigen.cliente})` : ''} a otra habitación.
              </p>
              <p className="text-tierra-muted text-xs mb-4">
                Los pedidos activos también se van a mover.
              </p>

              {mesasLibres.length === 0 ? (
                <p className="text-tierra-muted text-sm text-center py-4">
                  No hay habitaciones libres disponibles
                </p>
              ) : (
                <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
                  {mesasLibres.map(mesa => (
                    <button
                      key={mesa.id}
                      onClick={() => setMigrandoA(mesa.id)}
                      className={clsx(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                        migrandoA === mesa.id
                          ? 'bg-bronceado/15 border-bronceado/50 text-tierra'
                          : 'bg-windsor-lighter border-tierra/20 text-tierra-muted hover:border-tierra/40 hover:text-tierra'
                      )}
                    >
                      <span className="font-bold text-sm">{mesa.nombre}</span>
                      {migrandoA === mesa.id && (
                        <span className="w-4 h-4 rounded-full bg-bronceado flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-windsor" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setModalMigrar(null); setMigrandoA(null) }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  loading={migrando}
                  disabled={!migrandoA}
                  onClick={handleMigrar}
                >
                  Mover
                </Button>
              </div>
            </>
          )
        })()}
      </Modal>
    </div>
  )
}
