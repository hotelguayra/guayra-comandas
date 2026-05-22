import { supabase } from '@/lib/supabase'
import { cerrarMesa } from '@/services/tables'
import type { Mesa, Pedido } from '@/types'

export async function getMesasConPedidosActivos(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('mesas')
    .select('*, mozo_activo:profiles!mesas_mozo_activo_id_fkey(id, nombre, rol)')
    .neq('estado', 'libre')
    .eq('activa', true)
    .order('numero', { ascending: true })

  if (error) throw error
  return data as Mesa[]
}

export async function getMesasParaRecepcion(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('mesas')
    .select(`
      *,
      mozo_activo:profiles!mesas_mozo_activo_id_fkey(id, nombre, rol),
      pedidos(numero_ticket, descuento_porcentaje, estado, created_at, pedido_items(cantidad, precio_unitario))
    `)
    .eq('activa', true)
    .order('numero', { ascending: true })

  if (error) throw error

  return (data as any[]).map((m) => {
    const pedidos: any[] = m.pedidos ?? []
    const activos = pedidos.filter((p) =>
      p.estado !== 'cancelado' &&
      (!m.abierta_at || new Date(p.created_at) >= new Date(m.abierta_at))
    )
    const numero_ticket = activos[0]?.numero_ticket ?? undefined
    const subtotal = activos.reduce((sum: number, p: any) =>
      sum + (p.pedido_items ?? []).reduce((s: number, i: any) => s + i.cantidad * i.precio_unitario, 0), 0)
    const descPct = activos[0]?.descuento_porcentaje ?? 0
    const total_acumulado = subtotal > 0 ? Math.round(subtotal * (1 - descPct / 100)) : undefined
    return { ...m, numero_ticket, total_acumulado, pedidos: undefined }
  }) as Mesa[]
}

export async function getPedidosActivosDeMesa(mesaId: string, abiertaAt?: string | null): Promise<Pedido[]> {
  let query = supabase
    .from('pedidos')
    .select(`
      *,
      mozo:profiles!pedidos_mozo_id_fkey(id, nombre, rol),
      items:pedido_items(*, producto:productos(id, nombre, precio))
    `)
    .eq('mesa_id', mesaId)
    .in('estado', ['pendiente', 'en_preparacion', 'listo', 'entregado'])
    .order('created_at', { ascending: true })

  if (abiertaAt) {
    query = query.gte('created_at', abiertaAt)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Pedido[]
}

export interface FiltrosHistorial {
  cliente?: string
  numeroTicket?: string
  mesaId?: string
  desde?: string
  hasta?: string
}

export async function getHistorialPedidos(filtros: FiltrosHistorial = {}): Promise<Pedido[]> {
  let query = supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(id, nombre, numero, categoria, cliente),
      mozo:profiles!pedidos_mozo_id_fkey(id, nombre, rol),
      items:pedido_items(*, producto:productos(id, nombre, precio))
    `)
    .in('estado', ['entregado', 'cancelado'])
    .order('created_at', { ascending: false })
    .limit(2000)

  if (filtros.mesaId) {
    query = query.eq('mesa_id', filtros.mesaId)
  }

  if (filtros.desde) {
    query = query.gte('created_at', filtros.desde + 'T00:00:00')
  }

  if (filtros.hasta) {
    query = query.lte('created_at', filtros.hasta + 'T23:59:59')
  }

  if (filtros.cliente) {
    query = query.ilike('cliente', `%${filtros.cliente}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return data as Pedido[]
}

export async function aplicarDescuento(
  mesaId: string,
  porcentaje: number,
  motivo: string,
  abiertaAt?: string | null
): Promise<void> {
  let query = supabase
    .from('pedidos')
    .update({ descuento_porcentaje: porcentaje, descuento_motivo: motivo })
    .eq('mesa_id', mesaId)
    .in('estado', ['pendiente', 'en_preparacion', 'listo', 'entregado'])

  if (abiertaAt) {
    query = query.gte('created_at', abiertaAt)
  }

  const { error } = await query
  if (error) throw error
}

export async function cerrarMesaRecepcion(mesaId: string, abiertaAt?: string | null): Promise<void> {
  return cerrarMesa(mesaId, abiertaAt)
}

export async function aplicarDescuentoAPedidos(
  pedidoIds: string[],
  porcentaje: number,
  motivo: string
): Promise<void> {
  const { error } = await supabase
    .from('pedidos')
    .update({ descuento_porcentaje: porcentaje, descuento_motivo: motivo })
    .in('id', pedidoIds)

  if (error) throw error
}

export async function eliminarItemPedido(
  itemId: string,
  eliminadoPorId?: string,
  eliminadoPorNombre?: string
): Promise<void> {
  const { data: item, error: fetchError } = await supabase
    .from('pedido_items')
    .select('cantidad, precio_unitario, producto:productos(nombre), pedido:pedidos(mesa:mesas(nombre, cliente))')
    .eq('id', itemId)
    .single()

  if (fetchError) throw fetchError

  const cantidad = (item as any).cantidad as number
  const precioUnitario = (item as any).precio_unitario as number

  const { error: logError } = await supabase
    .from('items_eliminados')
    .insert({
      producto_nombre: (item as any).producto?.nombre ?? '—',
      cantidad,
      precio_unitario: precioUnitario,
      valor_total: cantidad * precioUnitario,
      mesa_nombre: (item as any).pedido?.mesa?.nombre ?? null,
      cliente: (item as any).pedido?.mesa?.cliente ?? null,
      eliminado_por: eliminadoPorId ?? null,
      eliminado_por_nombre: eliminadoPorNombre ?? null,
    })

  if (logError) throw logError

  const { error } = await supabase
    .from('pedido_items')
    .delete()
    .eq('id', itemId)
  if (error) throw error
}

export function calcularTotalPedidos(pedidos: Pedido[]): {
  subtotal: number
  descuentoPct: number
  descuentoMonto: number
  total: number
  motivo: string
} {
  const subtotal = pedidos.reduce((sum, p) => {
    const itemsTotal = (p.items ?? []).reduce(
      (s, i) => s + i.cantidad * i.precio_unitario,
      0
    )
    return sum + itemsTotal
  }, 0)

  const descuentoPct = pedidos[0]?.descuento_porcentaje ?? 0
  const motivo = pedidos[0]?.descuento_motivo ?? ''
  const descuentoMonto = (subtotal * descuentoPct) / 100
  const total = subtotal - descuentoMonto

  return { subtotal, descuentoPct, descuentoMonto, total, motivo }
}
