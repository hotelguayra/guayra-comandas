import { supabase } from '@/lib/supabase'
import type { Producto, Categoria, Subcategoria } from '@/types'

export async function getCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('activo', true)
    .order('fila', { ascending: true })
    .order('orden', { ascending: true })

  if (error) throw error
  return data as Categoria[]
}

export async function getAllCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true })

  if (error) throw error
  return data as Categoria[]
}

export async function createCategoria(data: Partial<Categoria>): Promise<Categoria> {
  const { data: result, error } = await supabase
    .from('categorias')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return result as Categoria
}

export async function updateCategoria(id: string, data: Partial<Categoria>): Promise<void> {
  const { error } = await supabase.from('categorias').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

export async function getProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(*)')
    .eq('disponible', true)
    .order('nombre', { ascending: true })

  if (error) throw error
  return data as Producto[]
}

export async function getAllProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(*)')
    .order('nombre', { ascending: true })

  if (error) throw error
  return data as Producto[]
}

export async function createProducto(data: Partial<Producto>): Promise<Producto> {
  const { data: result, error } = await supabase
    .from('productos')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return result as Producto
}

export async function updateProducto(id: string, data: Partial<Producto>): Promise<void> {
  const { error } = await supabase.from('productos').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteProducto(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw error
}

export async function getSubcategorias(): Promise<Subcategoria[]> {
  const { data, error } = await supabase
    .from('subcategorias')
    .select('*')
    .order('categoria_key')
    .order('orden')
  if (error) throw error
  return data as Subcategoria[]
}

export async function upsertSubcategorias(rows: Pick<Subcategoria, 'id' | 'orden'>[]): Promise<void> {
  await Promise.all(
    rows.map(({ id, orden }) =>
      supabase.from('subcategorias').update({ orden }).eq('id', id)
    )
  )
}

export async function createSubcategoria(
  categoria_key: string,
  nombre: string,
  orden: number
): Promise<Subcategoria> {
  const { data, error } = await supabase
    .from('subcategorias')
    .insert({ categoria_key, nombre, orden })
    .select()
    .single()
  if (error) throw error
  return data as Subcategoria
}

export async function deleteSubcategoria(id: string): Promise<void> {
  const { error } = await supabase.from('subcategorias').delete().eq('id', id)
  if (error) throw error
}

export async function toggleDisponibilidad(id: string, disponible: boolean): Promise<void> {
  const { error } = await supabase.from('productos').update({ disponible }).eq('id', id)
  if (error) throw error
}

export async function toggleDisponibilidadCompleto(id: string, disponible: boolean): Promise<void> {
  const patch = disponible
    ? { disponible: true, nota_stock: null, nota_stock_fecha: null }
    : { disponible: false, nota_stock_fecha: new Date().toISOString() }
  const { error } = await supabase.from('productos').update(patch).eq('id', id)
  if (error) throw error
}

export async function eliminarFaltante(id: string): Promise<void> {
  const { error } = await supabase
    .from('productos')
    .update({ nota_stock: null, nota_stock_fecha: null })
    .eq('id', id)
  if (error) throw error
}

export async function reponerTodoElStock(panelFilter?: 'cocina' | 'postres'): Promise<void> {
  let query = supabase.from('productos').update({ disponible: true, nota_stock: null, nota_stock_fecha: null })
  if (panelFilter) query = query.eq('panel', panelFilter)
  const { error } = await query
  if (error) throw error
}
