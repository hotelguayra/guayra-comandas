import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPedidosActivos, updatePanelEstado } from '@/services/orders'
import { useRealtimePedidos, useKitchenSound } from '@/hooks/useRealtime'
import { Spinner } from '@/components/ui/Spinner'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, Maximize2, ChefHat, Cake, Sun, Moon } from 'lucide-react'
import type { Pedido, OrderStatus } from '@/types'
import { clsx } from 'clsx'

const COLUMNS: { estado: OrderStatus; label: string; next: OrderStatus | null }[] = [
  { estado: 'pendiente', label: 'Pendientes', next: 'en_preparacion' },
  { estado: 'en_preparacion', label: 'En preparación', next: 'listo' },
  { estado: 'listo', label: 'Listos', next: 'entregado' },
]

const COLUMN_COLORS_DARK: Record<OrderStatus, string> = {
  pendiente: 'border-tierra/30',
  en_preparacion: 'border-bronceado/40',
  listo: 'border-jade/40',
  entregado: 'border-tierra/10',
  cancelado: 'border-rubi/20',
}

const COLUMN_COLORS_LIGHT: Record<OrderStatus, string> = {
  pendiente: 'border-tierra-dark/50',
  en_preparacion: 'border-bronceado/70',
  listo: 'border-jade-dark/60',
  entregado: 'border-tierra-dark/20',
  cancelado: 'border-rubi/50',
}

const NEXT_LABELS: Record<string, string> = {
  en_preparacion: 'Iniciar preparación',
  listo: 'Marcar listo',
  entregado: 'Marcar entregado',
}

function PostresCard({
  pedido,
  nextEstado,
  darkMode,
}: {
  pedido: Pedido
  nextEstado: OrderStatus | null
  darkMode: boolean
}) {
  const [updating, setUpdating] = useState(false)
  const queryClient = useQueryClient()
  const elapsed = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 60000)
  const isUrgent = elapsed >= 15

  const handleAdvance = async () => {
    if (!nextEstado) return
    setUpdating(true)
    try {
      await updatePanelEstado(pedido.id, 'postres', nextEstado)
      queryClient.invalidateQueries({ queryKey: ['pedidos-activos', 'postres'] })
    } finally {
      setUpdating(false)
    }
  }

  const panelItems = pedido.items?.filter((i) => i.producto?.panel === 'postres') ?? []
  const colColors = darkMode ? COLUMN_COLORS_DARK : COLUMN_COLORS_LIGHT

  return (
    <div
      className={clsx(
        'border rounded-2xl p-5 flex flex-col gap-4 shadow-card',
        darkMode ? 'bg-windsor-card' : 'bg-white',
        colColors[pedido.estado],
        isUrgent && pedido.estado === 'pendiente' && 'animate-pulse-slow'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('font-heading text-2xl', darkMode ? 'text-tierra-light' : 'text-windsor')}>
              {pedido.mesa?.nombre ?? `Mesa ${pedido.mesa?.numero}`}
            </span>
            {(pedido.mesa as any)?.estado === 'cuenta' && (
              <span className="text-xs font-bold text-rubi-light bg-rubi/20 border border-rubi/40 px-2 py-0.5 rounded-lg animate-pulse">
                CUENTA
              </span>
            )}
          </div>
          {(pedido.mesa as any)?.cliente && (
            <p className={clsx('font-bold text-sm', darkMode ? 'text-tierra' : 'text-windsor-light')}>
              {(pedido.mesa as any).cliente}
            </p>
          )}
          {pedido.mozo?.nombre && (
            <p className={clsx('text-xs', darkMode ? 'text-tierra-muted' : 'text-tierra-dark')}>
              {pedido.mozo.nombre}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Clock
            size={12}
            className={isUrgent ? 'text-rubi-light' : (darkMode ? 'text-tierra-muted' : 'text-tierra-dark')}
          />
          <span className={isUrgent ? 'text-rubi-light font-bold' : (darkMode ? 'text-tierra-muted' : 'text-tierra-dark')}>
            {elapsed}m
          </span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {panelItems.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className={clsx('font-heading text-xl w-8 flex-shrink-0', darkMode ? 'text-bronceado' : 'text-bronceado-dark')}>
              {item.cantidad}x
            </span>
            <div>
              <p className={clsx('font-bold text-base leading-tight', darkMode ? 'text-tierra' : 'text-windsor')}>
                {item.producto?.nombre}
              </p>
              {item.notas && (
                <p className={clsx('text-xs mt-0.5 italic', darkMode ? 'text-bronceado/80' : 'text-bronceado-dark/70')}>
                  {item.notas}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {pedido.notas && (
        <p className={clsx(
          'text-sm rounded-xl px-3 py-2 border',
          darkMode
            ? 'text-tierra-muted bg-windsor-lighter border-tierra/10'
            : 'text-windsor-light bg-tierra/20 border-tierra-dark/15'
        )}>
          {pedido.notas}
        </p>
      )}

      {nextEstado && (
        <button
          onClick={handleAdvance}
          disabled={updating}
          className={clsx(
            'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95',
            nextEstado === 'en_preparacion' && 'bg-bronceado text-windsor hover:bg-bronceado-light',
            nextEstado === 'listo' && 'bg-jade text-windsor hover:bg-jade-light',
            nextEstado === 'entregado' && (darkMode
              ? 'bg-tierra/20 text-tierra hover:bg-tierra/30 border border-tierra/20'
              : 'bg-tierra-dark/15 text-tierra-dark hover:bg-tierra-dark/25 border border-tierra-dark/20'),
            updating && 'opacity-50 cursor-not-allowed'
          )}
        >
          {updating ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {NEXT_LABELS[nextEstado]}
              <ChevronRight size={16} />
            </>
          )}
        </button>
      )}

    </div>
  )
}

export function PostresDisplay() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { playNotification } = useKitchenSound()
  const [time, setTime] = useState(new Date())
  const prevActiveCountRef = useRef<number | null>(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kitchen-theme') !== 'light')

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem('kitchen-theme', next ? 'dark' : 'light')
      return next
    })
  }

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pedidos-activos', 'postres'],
    queryFn: () => getPedidosActivos('postres'),
    refetchInterval: false,
    placeholderData: (prev) => prev,
  })

  const handleInsert = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pedidos-activos', 'postres'] })
  }, [queryClient])

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pedidos-activos', 'postres'] })
  }, [queryClient])

  useRealtimePedidos({ onInsert: handleInsert, onUpdate: handleUpdate })

  // getPedidosActivos ya filtra por panel 'postres'
  const getByEstado = (estado: OrderStatus) =>
    pedidos?.filter((p) => p.estado === estado) ?? []

  useEffect(() => {
    if (!pedidos) return
    const active = pedidos.filter(p =>
      ['pendiente', 'en_preparacion'].includes(p.estado)
    ).length
    if (prevActiveCountRef.current === null) {
      prevActiveCountRef.current = active
      return
    }
    const delta = active - prevActiveCountRef.current
    prevActiveCountRef.current = active
    if (delta <= 0) return
    for (let i = 0; i < Math.min(delta, 3); i++) {
      setTimeout(() => playNotification(), i * 300)
    }
  }, [pedidos, playNotification])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className={clsx('h-screen flex flex-col', darkMode ? 'bg-windsor' : 'bg-tierra-light')}>
      <header className={clsx(
        'px-6 py-3 flex items-center justify-between border-b',
        darkMode ? 'glass border-tierra/10' : 'bg-tierra-light/95 backdrop-blur-md border-tierra-dark/20'
      )}>
        <Logo size="sm" variant={darkMode ? 'dark' : 'light'} />
        <div className="flex items-center gap-4">
          <div className={clsx('flex items-center gap-1 rounded-xl p-1', darkMode ? 'bg-windsor-lighter' : 'bg-tierra/50')}>
            <button
              onClick={() => navigate('/cocina')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors',
                darkMode ? 'text-tierra-muted hover:text-tierra' : 'text-windsor/60 hover:text-windsor'
              )}
            >
              <ChefHat size={14} />
              Cocina
            </button>
            <button
              onClick={() => navigate('/postres')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors bg-bronceado text-windsor"
            >
              <Cake size={14} />
              Postres
            </button>
          </div>
          <span className={clsx('font-heading text-sm', darkMode ? 'text-tierra-muted' : 'text-tierra-dark')}>
            {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-jade animate-pulse" />
            <span className={clsx('text-xs', darkMode ? 'text-jade' : 'text-jade-dark')}>Realtime activo</span>
          </div>
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={clsx(
              'p-2 rounded-xl transition-colors',
              darkMode
                ? 'hover:bg-windsor-lighter text-bronceado'
                : 'hover:bg-tierra/40 text-windsor/70'
            )}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={handleFullscreen}
            className={clsx(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-windsor-lighter text-tierra-muted' : 'hover:bg-tierra/40 text-windsor/60'
            )}
          >
            <Maximize2 size={18} />
          </button>
          <LogoutButton
            iconOnly
            className={clsx(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'hover:bg-windsor-lighter text-tierra-muted' : 'hover:bg-tierra/40 text-windsor/60'
            )}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className={clsx(
          'flex-1 grid grid-cols-3 gap-0 overflow-hidden',
          darkMode ? 'divide-x divide-tierra/10' : 'divide-x divide-tierra-dark/20'
        )}>
          {COLUMNS.map(({ estado, label, next }) => {
            const columnPedidos = getByEstado(estado)
            return (
              <div key={estado} className="flex flex-col overflow-hidden">
                <div className={clsx(
                  'px-5 py-4 border-b flex items-center justify-between sticky top-0 z-10',
                  darkMode ? 'glass border-tierra/10' : 'bg-tierra/50 backdrop-blur-sm border-tierra-dark/15'
                )}>
                  <h3 className={clsx(
                    'font-heading text-sm uppercase tracking-widest',
                    darkMode ? 'text-tierra-muted' : 'text-windsor-light'
                  )}>
                    {label}
                  </h3>
                  {columnPedidos.length > 0 && (
                    <span className="w-6 h-6 rounded-full bg-bronceado/20 text-bronceado text-xs flex items-center justify-center font-bold">
                      {columnPedidos.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {columnPedidos.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <p className={clsx('text-sm', darkMode ? 'text-tierra-muted' : 'text-tierra-dark/60')}>
                        Sin pedidos
                      </p>
                    </div>
                  ) : (
                    columnPedidos.map((pedido) => (
                      <PostresCard
                        key={pedido.id}
                        pedido={pedido}
                        nextEstado={next}
                        darkMode={darkMode}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
