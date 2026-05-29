import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface PedidoListo {
  mesa_id: string
  mesaNombre: string
  cliente?: string
}

interface NotificacionesListos {
  count: number
  mesasListas: Set<string>
  pedidosListos: PedidoListo[]
  acknowledge: (mesaId: string) => void
  mesasRecibidas: number
  mesasTransferidas: PedidoListo[]
  acknowledgeTransferencias: () => void
  pedidosDeRecepcion: PedidoListo[]
  acknowledgeRecepcion: (mesaId: string) => void
}

export function useNotificacionesListos(mozoId: string | undefined): NotificacionesListos {
  const [pedidosListos, setPedidosListos] = useState<PedidoListo[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mesasRecibidas, setMesasRecibidas] = useState(0)
  const [mesasTransferidas, setMesasTransferidas] = useState<PedidoListo[]>([])
  const [pedidosDeRecepcion, setPedidosDeRecepcion] = useState<PedidoListo[]>([])
  const knownMesasRef = useRef<Set<string> | null>(null)
  const mesasMapRef = useRef<Map<string, { nombre: string; cliente?: string }>>(new Map())

  const queryMisMesas = useCallback(async () => {
    if (!mozoId) return new Set<string>()
    const { data } = await supabase
      .from('mesas')
      .select('id, nombre, cliente')
      .eq('mozo_activo_id', mozoId)
      .neq('estado', 'libre')
    const map = new Map<string, { nombre: string; cliente?: string }>()
    ;(data ?? []).forEach((m: any) => map.set(m.id, { nombre: m.nombre, cliente: m.cliente ?? undefined }))
    mesasMapRef.current = map
    return new Set((data ?? []).map((m: any) => m.id as string))
  }, [mozoId])

  // Compara con baseline e incrementa si hay mesas nuevas (transferencia)
  const fetchMisMesas = useCallback(async () => {
    const currentIds = await queryMisMesas()
    if (knownMesasRef.current === null) {
      knownMesasRef.current = currentIds
      return
    }
    const nuevasList: PedidoListo[] = []
    currentIds.forEach((id) => {
      if (!knownMesasRef.current!.has(id)) {
        const mesa = mesasMapRef.current.get(id)
        if (mesa) nuevasList.push({ mesa_id: id, mesaNombre: mesa.nombre, cliente: mesa.cliente })
      }
    })
    knownMesasRef.current = currentIds
    if (nuevasList.length > 0) {
      setMesasRecibidas((prev) => prev + nuevasList.length)
      setMesasTransferidas((prev) => [...prev, ...nuevasList.filter(n => !prev.some(p => p.mesa_id === n.mesa_id))])
    }
  }, [queryMisMesas])

  const acknowledgeTransferencias = useCallback(() => {
    setMesasRecibidas(0)
    setMesasTransferidas([])
  }, [])

  const acknowledgeRecepcion = useCallback((mesaId: string) => {
    setPedidosDeRecepcion((prev) => prev.filter(p => p.mesa_id !== mesaId))
  }, [])

  const fetchListos = useCallback(async () => {
    if (!mozoId) return
    // Filtra por mozo_id en el servidor para no traer todos los pedidos del sistema.
    // Luego comprueba client-side que algún panel esté en 'listo'.
    const { data } = await supabase
      .from('pedidos')
      .select(`
        mesa_id,
        mozo_id,
        mesa:mesas(nombre, cliente, estado, mozo_activo_id),
        panel_estados:pedido_panel_estados(estado)
      `)
      .eq('mozo_id', mozoId)

    const items: PedidoListo[] = (data ?? [])
      .filter((p: any) =>
        p.mesa?.mozo_activo_id === mozoId &&
        p.mesa?.estado !== 'libre' &&
        (p.panel_estados ?? []).some((pe: any) => pe.estado === 'listo')
      )
      .map((p: any) => ({
        mesa_id: p.mesa_id as string,
        mesaNombre: p.mesa?.nombre ?? '—',
        cliente: p.mesa?.cliente ?? undefined,
      }))

    const seen = new Set<string>()
    const filtered = items.filter((p) => {
      if (seen.has(p.mesa_id)) return false
      seen.add(p.mesa_id)
      return true
    })
    setPedidosListos(filtered)

    // Si una mesa ya no tiene órdenes listas, sacarla de dismissed para que
    // futuras notificaciones de esa misma mesa vuelvan a aparecer.
    const activosIds = new Set(filtered.map((p) => p.mesa_id))
    setDismissed((prev) => {
      const next = new Set<string>()
      prev.forEach((id) => { if (activosIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
  }, [mozoId])

  const acknowledge = useCallback((mesaId: string) => {
    setDismissed((prev) => new Set([...prev, mesaId]))
  }, [])

  useEffect(() => {
    knownMesasRef.current = null
    if (!mozoId) return
    fetchMisMesas()
    fetchListos()

    const channel = supabase
      .channel(`notif-listos-${mozoId}`)
      .on(
        'postgres_changes',
        // requiere: ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_panel_estados;
        { event: 'UPDATE', schema: 'public', table: 'pedido_panel_estados' },
        () => fetchListos()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          const p = payload.new as { mozo_id: string }
          if (p.mozo_id === mozoId) fetchListos()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => {
          const p = payload.new as { mesa_id: string; mozo_id: string }
          const misMesas = knownMesasRef.current
          if (!misMesas || !misMesas.has(p.mesa_id)) return
          // Si el pedido fue creado por alguien que no es este mozo (ej: recepción)
          if (p.mozo_id !== mozoId) {
            const mesa = mesasMapRef.current.get(p.mesa_id)
            if (!mesa) return
            setPedidosDeRecepcion((prev) => {
              if (prev.some(x => x.mesa_id === p.mesa_id)) return prev
              return [...prev, { mesa_id: p.mesa_id, mesaNombre: mesa.nombre, cliente: mesa.cliente }]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        // requiere: ALTER PUBLICATION supabase_realtime ADD TABLE public.mesas;
        { event: 'UPDATE', schema: 'public', table: 'mesas' },
        () => fetchMisMesas()
      )
      .subscribe()

    // Polling de respaldo: si la tabla no está en la publicación realtime,
    // o hay algún problema de red, igual actualizamos cada 30s.
    const interval = setInterval(fetchListos, 30_000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [mozoId, fetchListos, fetchMisMesas])

  const visibles = pedidosListos.filter((p) => !dismissed.has(p.mesa_id))
  const mesasListas = new Set(visibles.map((p) => p.mesa_id))

  return {
    count: visibles.length,
    mesasListas,
    pedidosListos: visibles,
    acknowledge,
    mesasRecibidas,
    mesasTransferidas,
    acknowledgeTransferencias,
    pedidosDeRecepcion,
    acknowledgeRecepcion,
  }
}
