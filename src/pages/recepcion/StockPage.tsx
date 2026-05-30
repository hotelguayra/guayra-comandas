import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtimeProductos } from '@/hooks/useRealtime'
import { getAllProductos, toggleDisponibilidadCompleto, eliminarFaltante, reponerTodoElStock } from '@/services/products'
import { Package, PackageX, RotateCcw, X, Search } from 'lucide-react'
import { clsx } from 'clsx'
import type { Producto } from '@/types'
import Fuse from 'fuse.js'

type Tab = 'disponibilidad' | 'faltantes'

export function StockPage() {
  const [tab, setTab] = useState<Tab>('disponibilidad')
  const [busqueda, setBusqueda] = useState('')
  const queryClient = useQueryClient()
  const [toggling, setToggling] = useState<string | null>(null)
  const [reponiendo, setReponiendo] = useState(false)

  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['productos-todos-disp'],
    queryFn: getAllProductos,
  })

  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['productos-todos-disp'] })
    queryClient.invalidateQueries({ queryKey: ['productos'] })
  }, [queryClient])

  useRealtimeProductos(invalidar)

  const handleToggle = async (id: string, disponible: boolean) => {
    setToggling(id)
    try {
      await toggleDisponibilidadCompleto(id, disponible)
      invalidar()
    } finally {
      setToggling(null)
    }
  }

  const handleEliminarFaltante = async (id: string) => {
    await eliminarFaltante(id)
    invalidar()
  }

  const handleReponerTodo = async () => {
    setReponiendo(true)
    try {
      await reponerTodoElStock()
      invalidar()
    } finally {
      setReponiendo(false)
    }
  }

  const fuse = useMemo(() => new Fuse(productos, {
    keys: ['nombre', 'categoria.nombre'],
    threshold: 0.35,
  }), [productos])

  const productosVisibles = busqueda.trim()
    ? fuse.search(busqueda.trim()).map(r => r.item)
    : productos

  const noDisponibles = productosVisibles.filter(p => !p.disponible)
  const disponibles = productosVisibles.filter(p => p.disponible)
  const faltantes = productosVisibles.filter(p => p.nota_stock_fecha != null)

  const disponiblesAgrupados = disponibles.reduce((acc, p) => {
    const cat = p.categoria?.nombre ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  const fmtFecha = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const panelLabel = (panel?: string | null) => {
    if (panel === 'cocina') return 'Cocina'
    if (panel === 'postres') return 'Postres'
    return null
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-tierra-light mb-1">Stock</h1>
        <p className="text-sm text-tierra-muted">
          {noDisponibles.length > 0
            ? `${noDisponibles.length} producto${noDisponibles.length !== 1 ? 's' : ''} agotado${noDisponibles.length !== 1 ? 's' : ''} · ${faltantes.length} faltante${faltantes.length !== 1 ? 's' : ''}`
            : 'Todo disponible'}
        </p>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-windsor-lighter rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('disponibilidad')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-bold transition-colors',
            tab === 'disponibilidad'
              ? 'bg-bronceado text-windsor'
              : 'text-tierra-muted hover:text-tierra'
          )}
        >
          Disponibilidad
        </button>
        <button
          onClick={() => setTab('faltantes')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5',
            tab === 'faltantes'
              ? 'bg-bronceado text-windsor'
              : 'text-tierra-muted hover:text-tierra'
          )}
        >
          Faltantes
          {faltantes.length > 0 && (
            <span className={clsx(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
              tab === 'faltantes' ? 'bg-windsor/20' : 'bg-rubi/20 text-rubi-light'
            )}>
              {faltantes.length}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-bronceado border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'disponibilidad' ? (
        <div className="space-y-5">
          {/* Reponer todo */}
          {noDisponibles.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-rubi-light font-bold">
                {noDisponibles.length} producto{noDisponibles.length !== 1 ? 's' : ''} sin stock
              </p>
              <button
                onClick={handleReponerTodo}
                disabled={reponiendo}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 bg-jade/15 text-jade hover:bg-jade/25"
              >
                {reponiendo
                  ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  : <RotateCcw size={12} />
                }
                Reponer todo
              </button>
            </div>
          )}

          {/* Sin stock primero */}
          {noDisponibles.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-rubi-light/70">
                Sin stock
              </p>
              <div className="space-y-1.5">
                {noDisponibles.map(p => (
                  <StockRow key={p.id} p={p} toggling={toggling} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}

          {/* Disponibles por categoría */}
          {Object.entries(disponiblesAgrupados).map(([cat, prods]) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-tierra-muted">
                {cat}
              </p>
              <div className="space-y-1.5">
                {prods.map(p => (
                  <StockRow key={p.id} p={p} toggling={toggling} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          ))}

          {productos.length === 0 && (
            <p className="text-sm text-tierra-muted text-center py-8">No hay productos</p>
          )}
        </div>
      ) : (
        <div>
          {faltantes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm text-tierra-muted">No hay faltantes</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {faltantes.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3 border border-rubi/25 bg-rubi/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate text-tierra">
                        {p.nombre}
                      </p>
                      {panelLabel(p.panel) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-windsor-lighter text-tierra-muted shrink-0">
                          {panelLabel(p.panel)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5 text-tierra-muted">
                      {fmtFecha(p.nota_stock_fecha!)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEliminarFaltante(p.id)}
                    title="Quitar de faltantes"
                    className="ml-3 p-1.5 rounded-lg transition-colors shrink-0 text-tierra-muted hover:text-rubi-light hover:bg-rubi/10"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StockRow({ p, toggling, onToggle }: {
  p: Producto
  toggling: string | null
  onToggle: (id: string, disponible: boolean) => void
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between rounded-xl px-4 py-3 border transition-colors',
      p.disponible
        ? 'border-tierra/10 bg-windsor-lighter/50'
        : 'border-rubi/30 bg-rubi/5'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {p.disponible
          ? <Package size={14} className="text-jade flex-shrink-0" />
          : <PackageX size={14} className="text-rubi-light flex-shrink-0" />
        }
        <div className="min-w-0">
          <span className={clsx(
            'text-sm font-medium truncate block',
            p.disponible ? 'text-tierra' : 'text-rubi-light line-through opacity-70'
          )}>
            {p.nombre}
          </span>
          {p.categoria?.nombre && (
            <span className="text-[10px] text-tierra-muted">{p.categoria.nombre}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onToggle(p.id, !p.disponible)}
        disabled={toggling === p.id}
        title={p.disponible ? 'Marcar agotado' : 'Marcar disponible'}
        className={clsx(
          'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-3',
          toggling === p.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          p.disponible ? 'bg-jade' : 'bg-rubi/60'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          p.disponible ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}
