import { clsx } from 'clsx'
import type { OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pendiente: 'badge-pendiente',
  en_preparacion: 'badge-en_preparacion',
  listo: 'badge-listo',
  entregado: 'badge-entregado',
  cancelado: 'badge-cancelado',
}

interface BadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border',
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface RoleBadgeProps {
  rol: string
  className?: string
}

export function RoleBadge({ rol, className }: RoleBadgeProps) {
  const classes: Record<string, string> = {
    admin: 'bg-rubi/20 text-rubi-light border border-rubi/30',
    cocina: 'bg-bronceado/20 text-bronceado border border-bronceado/30',
    mozo: 'bg-jade/20 text-jade border border-jade/30',
    recepcion: 'bg-tierra/15 text-tierra border border-tierra/30',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border capitalize',
        classes[rol] ?? 'bg-tierra/10 text-tierra border-tierra/20',
        className
      )}
    >
      {rol}
    </span>
  )
}
