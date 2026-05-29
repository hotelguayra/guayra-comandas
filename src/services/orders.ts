import { supabase } from '@/lib/supabase'
import type { Pedido, NewPedidoItem, OrderStatus } from '@/types'

export async function createPedido(
  mesaId: string,
  mozoId: string,
  items: NewPedidoItem[],
  notas?: string,
  initialEstado: OrderStatus = 'pendiente',
  cliente?: string,
  panels: ('cocina' | 'postres')[] = []
): Promise<Pedido> {
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({ mesa_id: mesaId, mozo_id: mozoId, estado: initialEstado, notas, cliente: cliente ?? null })
    .select()
    .single()

  if (pedidoError) throw pedidoError

  const itemsToInsert = items.map((item) => ({
    pedido_id: pedido.id,
    ...item,
  }))

  const { error: itemsError } = await supabase.from('pedido_items').insert(itemsToInsert)
  if (itemsError) throw itemsError

  // Crear un estado independiente por cada panel presente en el pedido
  if (panels.length > 0) {
    const panelRows = panels.map((panel) => ({
      pedido_id: pedido.id,
      panel,
      estado: 'pendiente' as OrderStatus,
    }))
    const { error: panelError } = await supabase.from('pedido_panel_estados').insert(panelRows)
    if (panelError) throw panelError
  }

  return pedido as Pedido
}

// Pedidos activos filtrados por panel — usa pedido_panel_estados para estado independiente
export async function getPedidosActivos(panel: 'cocina' | 'postres'): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedido_panel_estados')
    .select(`
      estado,
      pedido:pedidos(
        id, mesa_id, mozo_id, notas, created_at, updated_at,
        numero_ticket, cliente, descuento_porcentaje, descuento_motivo,
        mesa:mesas(*),
        mozo:profiles(*),
        items:pedido_items(*, producto:productos(*))
      )
    `)
    .eq('panel', panel)
    .not('estado', 'in', '("entregado","cancelado")')

  if (error) throw error

  return (data as any[])
    .filter((row) => row.pedido)
    .map((row) => ({
      ...row.pedido,
      estado: row.estado, // estado del panel, no el global del pedido
    }))
    .sort((a: Pedido, b: Pedido) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) as Pedido[]
}

function aggregatePanelEstado(estados: OrderStatus[]): OrderStatus {
  if (estados.every(e => e === 'entregado')) return 'entregado'
  if (estados.every(e => e === 'listo' || e === 'entregado')) return 'listo'
  if (estados.some(e => e === 'en_preparacion')) return 'en_preparacion'
  return 'pendiente'
}

// Avanza el estado de UN panel específico y sincroniza pedidos.estado con el agregado
export async function updatePanelEstado(
  pedidoId: string,
  panel: 'cocina' | 'postres',
  estado: OrderStatus
): Promise<void> {
  const now = new Date().toISOString()
  const update: Record<string, string> = { estado, updated_at: now }
  if (estado === 'listo') update.listo_at = now

  const { error } = await supabase
    .from('pedido_panel_estados')
    .update(update)
    .eq('pedido_id', pedidoId)
    .eq('panel', panel)

  if (error) throw error

  const { data: allPaneles, error: fetchError } = await supabase
    .from('pedido_panel_estados')
    .select('estado')
    .eq('pedido_id', pedidoId)

  if (fetchError) throw fetchError

  if (allPaneles && allPaneles.length > 0) {
    const agregado = aggregatePanelEstado(allPaneles.map((p: any) => p.estado as OrderStatus))
    const { error: syncError } = await supabase
      .from('pedidos')
      .update({ estado: agregado, updated_at: now })
      .eq('id', pedidoId)
    if (syncError) throw syncError
  }
}


// Actualiza el estado global del pedido y sincroniza pedido_panel_estados
// para que los cambios del admin se reflejen en los paneles de cocina/postres
export async function updatePedidoEstado(pedidoId: string, estado: OrderStatus): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('pedidos')
    .update({ estado, updated_at: now })
    .eq('id', pedidoId)
  if (error) throw error

  const { error: panelError } = await supabase
    .from('pedido_panel_estados')
    .update({ estado, updated_at: now })
    .eq('pedido_id', pedidoId)
    .not('estado', 'in', '("entregado","cancelado")')
  if (panelError) throw panelError
}

export async function getAllPedidos(limit = 50): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(*),
      mozo:profiles(*),
      items:pedido_items(*, producto:productos(*))
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Pedido[]
}

export async function getPedidosForMesas(
  mesas: { id: string; abierta_at?: string | null }[]
): Promise<Pedido[]> {
  if (mesas.length === 0) return []

  const mesaIds = mesas.map(m => m.id)

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(*),
      items:pedido_items(*, producto:productos(*)),
      panel_estados:pedido_panel_estados(*)
    `)
    .in('mesa_id', mesaIds)
    .neq('estado', 'cancelado')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data as Pedido[]).filter(p => {
    const mesa = mesas.find(m => m.id === p.mesa_id)
    if (!mesa?.abierta_at) return true
    return new Date(p.created_at) >= new Date(mesa.abierta_at)
  })
}
