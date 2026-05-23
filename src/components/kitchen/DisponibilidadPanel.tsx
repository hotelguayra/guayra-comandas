import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProductos, toggleDisponibilidad } from '@/services/products'
import { Package, PackageX } from 'lucide-react'
import { clsx } from 'clsx'
import type { Producto } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  darkMode: boolean
}

export function DisponibilidadPanel({ open, onClose, darkMode }: Props) {
  const queryClient = useQueryClient()
  const [toggling, setToggling] = useState<string | null>(null)

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos-todos-disp'],
    queryFn: getAllProductos,
    enabled: open,
  })

  const handleToggle = async (id: string, disponible: boolean) => {
    setToggling(id)
    try {
      await toggleDisponibilidad(id, disponible)
      queryClient.invalidateQueries({ queryKey: ['productos-todos-disp'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    } finally {
      setToggling(null)
    }
  }

  if (!open) return null

  const agrupados = productos.reduce((acc, p) => {
    const cat = p.categoria?.nombre ?? 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  const noDisponibles = productos.filter(p => !p.disponible).length

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className={clsx(
        'fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto flex flex-col',
        darkMode ? 'bg-windsor border-l border-tierra/15' : 'bg-white border-l border-tierra-dark/20'
      )}>
        <div className={clsx(
          'sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10',
          darkMode ? 'bg-windsor border-tierra/15' : 'bg-white border-tierra-dark/20'
        )}>
          <div>
            <h2 className={clsx('font-heading text-base', darkMode ? 'text-tierra-light' : 'text-windsor')}>
              Disponibilidad
            </h2>
            {noDisponibles > 0 && (
              <p className="text-xs text-rubi-light mt-0.5">{noDisponibles} producto{noDisponibles !== 1 ? 's' : ''} agotado{noDisponibles !== 1 ? 's' : ''}</p>
            )}
          </div>
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

        <div className="flex-1 p-4 space-y-5">
          {Object.entries(agrupados).map(([cat, prods]) => (
            <div key={cat}>
              <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-2', darkMode ? 'text-tierra-muted' : 'text-tierra-dark/60')}>
                {cat}
              </p>
              <div className="space-y-1.5">
                {prods.map(p => (
                  <div
                    key={p.id}
                    className={clsx(
                      'flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors',
                      p.disponible
                        ? (darkMode ? 'border-tierra/10 bg-windsor-lighter/50' : 'border-tierra-dark/15 bg-tierra/5')
                        : (darkMode ? 'border-rubi/30 bg-rubi/5' : 'border-rubi/40 bg-rubi/5')
                    )}
                  >
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
                      onClick={() => handleToggle(p.id, !p.disponible)}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
