import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProductos, toggleDisponibilidadCompleto, reponerTodoElStock } from '@/services/products'
import { Package, PackageX, RotateCcw, Search, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Producto } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  darkMode: boolean
  panelFilter?: 'cocina' | 'postres'
}

export function DisponibilidadPanel({ open, onClose, darkMode, panelFilter }: Props) {
  const queryClient = useQueryClient()
  const [toggling, setToggling] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [catActiva, setCatActiva] = useState<string | null>(null)
  const [reponiendo, setReponiendo] = useState(false)

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos-todos-disp'],
    queryFn: getAllProductos,
    enabled: open,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['productos-todos-disp'] })
    queryClient.invalidateQueries({ queryKey: ['productos'] })
  }

  const handleToggle = async (id: string, disponible: boolean) => {
    setToggling(id)
    try {
      await toggleDisponibilidadCompleto(id, disponible)
      invalidar()
    } finally {
      setToggling(null)
    }
  }

  const handleReponerTodo = async () => {
    setReponiendo(true)
    try {
      await reponerTodoElStock(panelFilter)
      invalidar()
    } finally {
      setReponiendo(false)
    }
  }

  if (!open) return null

  const productosPorPanel = panelFilter
    ? productos.filter(p => p.panel === panelFilter)
    : productos

  const categorias = [...new Set(productosPorPanel.map(p => p.categoria?.nombre ?? 'Sin categoría'))]
  const searching = busqueda.trim().length > 0

  let productosVisibles = productosPorPanel
  if (searching) {
    const q = busqueda.toLowerCase()
    productosVisibles = productosVisibles.filter(p => p.nombre.toLowerCase().includes(q))
  } else if (catActiva) {
    productosVisibles = productosVisibles.filter(p => (p.categoria?.nombre ?? 'Sin categoría') === catActiva)
  }

  // Non-available first, then available grouped by category
  const noDisponibles = productosVisibles.filter(p => !p.disponible)
  const disponibles = productosVisibles.filter(p => p.disponible)

  const disponiblesAgrupados = disponibles.reduce((acc, p) => {
    const cat = p.categoria?.nombre ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  const totalNoDisponibles = productosPorPanel.filter(p => !p.disponible).length

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className={clsx(
        'fixed right-0 top-0 bottom-0 w-1/2 min-w-80 z-50 overflow-y-auto flex flex-col',
        darkMode ? 'bg-windsor border-l border-tierra/15' : 'bg-white border-l border-tierra-dark/20'
      )}>
        {/* Header */}
        <div className={clsx(
          'sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10',
          darkMode ? 'bg-windsor border-tierra/15' : 'bg-white border-tierra-dark/20'
        )}>
          <div>
            <h2 className={clsx('font-heading text-base', darkMode ? 'text-tierra-light' : 'text-windsor')}>
              Disponibilidad
            </h2>
            {totalNoDisponibles > 0 && (
              <p className="text-xs text-rubi-light mt-0.5">
                {totalNoDisponibles} producto{totalNoDisponibles !== 1 ? 's' : ''} agotado{totalNoDisponibles !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {totalNoDisponibles > 0 && (
              <button
                onClick={handleReponerTodo}
                disabled={reponiendo}
                className={clsx(
                  'text-xs font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50',
                  darkMode ? 'bg-jade/15 text-jade hover:bg-jade/25' : 'bg-jade-dark/10 text-jade-dark hover:bg-jade-dark/20'
                )}
              >
                {reponiendo
                  ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  : <RotateCcw size={11} />
                }
                Reponer todo
              </button>
            )}
            <button
              onClick={onClose}
              className={clsx(
                'p-1.5 rounded-lg transition-colors text-sm font-bold',
                darkMode ? 'text-tierra-muted hover:text-tierra hover:bg-windsor-lighter' : 'text-windsor/60 hover:text-windsor hover:bg-tierra/30'
              )}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search + chips */}
        <div className={clsx(
          'px-4 pt-3 pb-2 space-y-2 border-b',
          darkMode ? 'border-tierra/10' : 'border-tierra-dark/10'
        )}>
          <div className="relative">
            <Search size={12} className={clsx(
              'absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none',
              darkMode ? 'text-tierra-muted' : 'text-tierra-dark/50'
            )} />
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); if (catActiva) setCatActiva(null) }}
              className={clsx(
                'w-full text-xs rounded-xl pl-7 pr-7 py-1.5 focus:outline-none transition-colors',
                darkMode
                  ? 'bg-windsor-lighter border border-tierra/15 text-tierra placeholder-tierra-muted focus:border-bronceado/40'
                  : 'bg-tierra/10 border border-tierra-dark/15 text-windsor placeholder-tierra-dark/50 focus:border-bronceado/50'
              )}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className={clsx('absolute right-2.5 top-1/2 -translate-y-1/2', darkMode ? 'text-tierra-muted hover:text-tierra' : 'text-tierra-dark/50 hover:text-windsor')}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {!searching && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setCatActiva(null)}
                className={clsx(
                  'px-2.5 py-0.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors',
                  !catActiva
                    ? 'bg-bronceado text-windsor'
                    : (darkMode ? 'bg-windsor-lighter text-tierra-muted hover:text-tierra' : 'bg-tierra/20 text-tierra-dark/70 hover:text-windsor')
                )}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatActiva(catActiva === cat ? null : cat)}
                  className={clsx(
                    'px-2.5 py-0.5 rounded-lg text-[11px] font-bold shrink-0 transition-colors',
                    catActiva === cat
                      ? 'bg-bronceado text-windsor'
                      : (darkMode ? 'bg-windsor-lighter text-tierra-muted hover:text-tierra' : 'bg-tierra/20 text-tierra-dark/70 hover:text-windsor')
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 space-y-5">
          {/* No disponibles primero */}
          {noDisponibles.length > 0 && (
            <div>
              <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-2', darkMode ? 'text-rubi-light/70' : 'text-rubi/70')}>
                Sin stock
              </p>
              <div className="space-y-1.5">
                {noDisponibles.map(p => (
                  <ProductoRow key={p.id} p={p} darkMode={darkMode} toggling={toggling} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}

          {/* Disponibles por categoría */}
          {Object.entries(disponiblesAgrupados).map(([cat, prods]) => (
            <div key={cat}>
              <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-2', darkMode ? 'text-tierra-muted' : 'text-tierra-dark/60')}>
                {cat}
              </p>
              <div className="space-y-1.5">
                {prods.map(p => (
                  <ProductoRow key={p.id} p={p} darkMode={darkMode} toggling={toggling} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ProductoRow({ p, darkMode, toggling, onToggle }: {
  p: Producto
  darkMode: boolean
  toggling: string | null
  onToggle: (id: string, disponible: boolean) => void
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors',
      p.disponible
        ? (darkMode ? 'border-tierra/10 bg-windsor-lighter/50' : 'border-tierra-dark/15 bg-tierra/5')
        : (darkMode ? 'border-rubi/30 bg-rubi/5' : 'border-rubi/40 bg-rubi/5')
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {p.disponible
          ? <Package size={13} className={clsx('flex-shrink-0', darkMode ? 'text-jade' : 'text-jade-dark')} />
          : <PackageX size={13} className="text-rubi-light flex-shrink-0" />
        }
        <span className={clsx(
          'text-sm font-medium truncate',
          p.disponible
            ? (darkMode ? 'text-tierra' : 'text-windsor')
            : 'text-rubi-light line-through opacity-70'
        )}>
          {p.nombre}
        </span>
      </div>
      <button
        onClick={() => onToggle(p.id, !p.disponible)}
        disabled={toggling === p.id}
        title={p.disponible ? 'Marcar agotado' : 'Marcar disponible'}
        className={clsx(
          'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-2',
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
