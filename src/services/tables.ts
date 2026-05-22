import { supabase } from '@/lib/supabase'
import type { Mesa } from '@/types'

export async function getMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('mesas')
    .select('*, mozo_activo:profiles!mesas_mozo_activo_id_fkey(id, nombre, rol)')
    .eq('activa', true)
    .order('numero', { ascending: true })

  if (error) throw error
  return data as Mesa[]
}

export async function getAllMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from('mesas')
    .select('*, mozo_activo:profiles!mesas_mozo_activo_id_fkey(id, nombre, rol)')
    .order('numero', { ascending: true })

  if (error) throw error
  return data as Mesa[]
}

export async function abrirMesa(mesaId: string, mozoId: string, cliente: string): Promise<void> {
  const { error } = await supabase
    .from('mesas')
    .update({
      estado: 'ocupada',
      mozo_activo_id: mozoId,
      cliente: cliente.trim(),
      abierta_at: new Date().toISOString(),
    })
    .eq('id', mesaId)

  if (error) throw error
}

export async function pedirCuenta(mesaId: string): Promise<void> {
  const { error } = await supabase
    .from('mesas')
    .update({ estado: 'cuenta' })
    .eq('id', mesaId)

  if (error) throw error
}

export async function cancelarCuenta(mesaId: string): Promise<void> {
  const { error } = await supabase
    .from('mesas')
    .update({ estado: 'ocupada' })
    .eq('id', mesaId)

  if (error) throw error
}

export async function cerrarMesa(mesaId: string, abiertaAt?: string | null): Promise<void> {
  let pedidosQuery = supabase
    .from('pedidos')
    .update({ estado: 'entregado', updated_at: new Date().toISOString() })
    .eq('mesa_id', mesaId)
    .in('estado', ['pendiente', 'en_preparacion', 'listo'])

  if (abiertaAt) pedidosQuery = pedidosQuery.gte('created_at', abiertaAt)

  const { error: pedidosError } = await pedidosQuery
  if (pedidosError) throw pedidosError

  const { error } = await supabase
    .from('mesas')
    .update({ estado: 'libre', mozo_activo_id: null, cliente: null, abierta_at: null })
    .eq('id', mesaId)
    .neq('estado', 'libre')

  if (error) throw error
}

export async function createMesa(data: Partial<Mesa>): Promise<Mesa> {
  const { data: result, error } = await supabase
    .from('mesas')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return result as Mesa
}

export async function updateMesa(id: string, data: Partial<Mesa>): Promise<void> {
  const { error } = await supabase.from('mesas').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteMesa(id: string): Promise<void> {
  const { error } = await supabase.from('mesas').delete().eq('id', id)
  if (error) throw error
}

export async function transferirMesasAlMozo(fromMozoId: string, toMozoId: string): Promise<void> {
  const { error } = await supabase.rpc('transferir_mesas_a_mozo', {
    from_mozo_id: fromMozoId,
    to_mozo_id: toMozoId,
  })
  if (error) throw error
}

export async function transferirMesasEspecificas(mesaIds: string[], toMozoId: string): Promise<void> {
  const { error } = await supabase.rpc('transferir_mesas_especificas', {
    mesa_ids: mesaIds,
    to_mozo_id: toMozoId,
  })
  if (error) throw error
}

export async function migrarMesa(
  fromMesaId: string,
  toMesaId: string,
  mozoId: string,
  cliente: string | null,
  estado: string,
  abiertaAt: string | null
): Promise<void> {
  const { error: e1 } = await supabase
    .from('mesas')
    .update({ mozo_activo_id: mozoId, cliente, estado, abierta_at: abiertaAt })
    .eq('id', toMesaId)
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from('pedidos')
    .update({ mesa_id: toMesaId })
    .eq('mesa_id', fromMesaId)
    .in('estado', ['pendiente', 'en_preparacion', 'listo'])
  if (e2) throw e2

  const { error: e3 } = await supabase
    .from('mesas')
    .update({ estado: 'libre', mozo_activo_id: null, cliente: null, abierta_at: null })
    .eq('id', fromMesaId)
  if (e3) throw e3
}
