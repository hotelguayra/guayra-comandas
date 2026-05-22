import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  align?: 'bottom' | 'top' | 'center'
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', align = 'bottom' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  const alignClass =
    align === 'top'    ? 'items-start pt-16' :
    align === 'center' ? 'items-center' :
                         'items-end sm:items-center'

  // Portal evita que backdrop-filter del ancestro atrape el fixed positioning
  return createPortal(
    <div className={clsx('fixed inset-0 z-[9999] flex justify-center p-4', alignClass)}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full card p-6 animate-slide-up',
          sizes[size]
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between mb-5">
            <div>
              {title && <h3 className="font-heading text-lg text-tierra-light">{title}</h3>}
              {subtitle && <p className="text-sm text-tierra-muted mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-windsor-lighter text-tierra-muted transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
