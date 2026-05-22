import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllPedidos, updatePedidoEstado } from '@/services/orders'
import { useRealtimePedidos } from '@/hooks/useRealtime'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { Clock } from 'lucide-react'
import type { OrderStatus } from '@/types'
import { useCallback } from 'react'

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'listo', label: 'Listo' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function AdminPedidos() {
  const queryClient = useQueryClient()

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['all-pedidos-admin'],
    queryFn: () => getAllPedidos(100),
    refetchInterval: false,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['all-pedidos-admin'] })
  }, [queryClient])

  useRealtimePedidos({ onInsert: invalidate, onUpdate: invalidate })

  const handleEstado = async (id: string, estado: OrderStatus) => {
    await updatePedidoEstado(id, estado)
    queryClient.invalidateQueries({ queryKey: ['all-pedidos-admin'] })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-tierra-light mb-1">Gestión de pedidos</h1>
        <p className="text-tierra-muted text-sm">Realtime — {pedidos?.length ?? 0} pedidos recientes</p>
      </div>

      <div className="space-y-3">
        {pedidos?.map((pedido) => {
          const elapsed = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 60000)
          return (
            <div key={pedido.id} className="card p-5 animate-fade-in">
              <div className="flex flex-wrap items-start gap-4 justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className="font-heading text-xl text-tierra-light">Mesa {pedido.mesa?.numero}</span>
                  <StatusBadge status={pedido.estado} />
                  <div className="flex items-center gap-1.5 text-tierra-muted text-xs">
                    <Clock size={12} />
                    <span>{elapsed}m</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-tierra-muted text-xs">{pedido.mozo?.nombre}</span>
                  <select
                    value={pedido.estado}
                    onChange={(e) => handleEstado(pedido.id, e.target.value as OrderStatus)}
                    className="bg-windsor-lighter border border-tierra/20 text-tierra text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-bronceado/30"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {pedido.items?.map((item) => (
                  <span key={item.id} className="text-sm text-tierra">
                    <span className="text-bronceado font-bold">{item.cantidad}x</span> {item.producto?.nombre}
                    {item.notas && <span className="text-tierra-muted"> ({item.notas})</span>}
                  </span>
                ))}
              </div>

              {pedido.notas && (
                <p className="mt-2 text-tierra-muted text-xs bg-windsor-lighter rounded-lg px-3 py-2">
                  Nota: {pedido.notas}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
