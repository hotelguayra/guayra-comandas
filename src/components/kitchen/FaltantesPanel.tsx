import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProductos, eliminarFaltante } from '@/services/products'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Producto } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  darkMode: boolean
}

export function FaltantesPanel({ open, onClose, darkMode }: Props) {
  const queryClient = useQueryClient()

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos-todos-disp'],
    queryFn: getAllProductos,
    enabled: open,
  })

  const handleEliminar = async (id: string) => {
    await eliminarFaltante(id)
    queryClient.invalidateQueries({ queryKey: ['productos-todos-disp'] })
    queryClient.invalidateQueries({ queryKey: ['productos'] })
  }

  if (!open) return null

  const faltantes = productos.filter(p => p.nota_stock_fecha != null)

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
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className={clsx(
        'fixed right-0 top-0 bottom-0 w-1/2 min-w-80 z-50 overflow-y-auto flex flex-col',
        darkMode ? 'bg-windsor border-l border-tierra/15' : 'bg-white border-l border-tierra-dark/20'
      )}>
        <div className={clsx(
          'sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10',
          darkMode ? 'bg-windsor border-tierra/15' : 'bg-white border-tierra-dark/20'
        )}>
          <div>
            <h2 className={clsx('font-heading text-base', darkMode ? 'text-tierra-light' : 'text-windsor')}>
              Faltantes
            </h2>
            <p className={clsx('text-xs mt-0.5', faltantes.length > 0 ? 'text-rubi-light' : (darkMode ? 'text-tierra-muted' : 'text-tierra-dark/50'))}>
              {faltantes.length === 0 ? 'Sin faltantes' : `${faltantes.length} producto${faltantes.length !== 1 ? 's' : ''} a pedir`}
            </p>
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

        <div className="flex-1 p-4">
          {faltantes.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className={clsx('text-sm', darkMode ? 'text-tierra-muted' : 'text-tierra-dark/60')}>
                No hay faltantes
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {faltantes.map(p => (
                <div
                  key={p.id}
                  className={clsx(
                    'flex items-center justify-between rounded-xl px-4 py-3 border',
                    darkMode ? 'border-rubi/25 bg-rubi/5' : 'border-rubi/30 bg-rubi/5'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={clsx('text-sm font-medium truncate', darkMode ? 'text-tierra' : 'text-windsor')}>
                        {p.nombre}
                      </p>
                      {panelLabel(p.panel) && (
                        <span className={clsx(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                          darkMode ? 'bg-windsor-lighter text-tierra-muted' : 'bg-tierra/20 text-tierra-dark/60'
                        )}>
                          {panelLabel(p.panel)}
                        </span>
                      )}
                    </div>
                    <p className={clsx('text-[10px] mt-0.5', darkMode ? 'text-tierra-muted' : 'text-tierra-dark/60')}>
                      {fmtFecha(p.nota_stock_fecha!)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEliminar(p.id)}
                    title="Quitar de faltantes"
                    className={clsx(
                      'ml-3 p-1.5 rounded-lg transition-colors shrink-0',
                      darkMode ? 'text-tierra-muted hover:text-rubi-light hover:bg-rubi/10' : 'text-tierra-dark/50 hover:text-rubi hover:bg-rubi/10'
                    )}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
