import { useEffect } from 'react'
import { ChefHat, X, PlusCircle } from 'lucide-react'

export interface ToastItem {
  id: string
  mesaNombre: string
  cliente?: string
  tipo?: 'listo' | 'recepcion'
  mesa_id?: string
}

function ToastCard({
  toast,
  onDismiss,
  onNavigate,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
  onNavigate?: (mesaId: string) => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 2500)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const esRecepcion = toast.tipo === 'recepcion'
  const clickable = esRecepcion && toast.mesa_id && onNavigate

  const handleClick = () => {
    if (clickable) {
      onNavigate!(toast.mesa_id!)
      onDismiss(toast.id)
    }
  }

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      className={`flex items-center gap-3 bg-windsor-card border rounded-2xl px-4 py-3 shadow-xl animate-fade-in min-w-[220px] max-w-[280px] ${esRecepcion ? 'border-bronceado/40' : 'border-jade/40'} ${clickable ? 'cursor-pointer hover:bg-windsor-lighter transition-colors' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${esRecepcion ? 'bg-bronceado/20' : 'bg-jade/20'}`}>
        {esRecepcion
          ? <PlusCircle size={16} className="text-bronceado" />
          : <ChefHat size={16} className="text-jade" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-tight ${esRecepcion ? 'text-bronceado' : 'text-jade'}`}>
          {esRecepcion ? 'Recepción agregó items' : '¡Pedido listo!'}
        </p>
        <p className="text-tierra text-xs font-medium truncate">{toast.mesaNombre}</p>
        {toast.cliente && (
          <p className="text-tierra-muted text-xs truncate">{toast.cliente}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
        className="text-tierra-muted hover:text-tierra flex-shrink-0 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer({
  toasts,
  onDismiss,
  onNavigate,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  onNavigate?: (mesaId: string) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-16 right-3 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={onDismiss} onNavigate={onNavigate} />
        </div>
      ))}
    </div>
  )
}
