import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Pedido, OrderStatus } from '@/types'

interface UseRealtimePedidosOptions {
  onInsert?: (pedido: Pedido) => void
  onUpdate?: (pedido: { id: string; estado: OrderStatus }) => void
  onDelete?: (id: string) => void
}

export function useRealtimePedidos({
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimePedidosOptions) {
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => onInsert?.(payload.new as Pedido)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) =>
          onUpdate?.({ id: payload.new.id, estado: payload.new.estado as OrderStatus })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pedidos' },
        (payload) => onDelete?.(payload.old.id as string)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedido_panel_estados' },
        (payload) => onInsert?.(payload.new as Pedido)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedido_panel_estados' },
        (payload) =>
          onUpdate?.({ id: payload.new.pedido_id, estado: payload.new.estado as OrderStatus })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onInsert, onUpdate, onDelete])
}

export function useKitchenSound() {
  const playNotification = useCallback(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.4)
  }, [])

  return { playNotification }
}
