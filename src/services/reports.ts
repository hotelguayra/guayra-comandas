import { supabase } from '@/lib/supabase'

export interface ResumenVentas {
  totalVentas: number
  totalPedidos: number
  ticketPromedio: number
  pedidosCancelados: number
}

export interface TopProducto {
  nombre: string
  cantidad: number
  totalVentas: number
}

export interface VentaCategoria {
  categoria: string
  totalVentas: number
  cantidad: number
}

export interface EstadisticaMozo {
  nombre: string
  totalPedidos: number
  totalVentas: number
  ticketPromedio: number
  mesasAtendidas: number
}

export interface VentaDia {
  fecha: string
  totalVentas: number
  totalPedidos: number
}

export interface VentaHora {
  hora: number
  totalPedidos: number
}

export async function getResumenVentas(desde: string, hasta: string): Promise<ResumenVentas> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, estado, pedido_items(precio_unitario, cantidad)')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  const pedidos = (data ?? []) as any[]
  const entregados = pedidos.filter(p => p.estado === 'entregado')
  const pedidosCancelados = pedidos.filter(p => p.estado === 'cancelado').length

  let totalVentas = 0
  for (const p of entregados) {
    for (const item of (p.pedido_items ?? [])) {
      totalVentas += item.precio_unitario * item.cantidad
    }
  }

  const totalPedidos = entregados.length
  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0

  return { totalVentas, totalPedidos, ticketPromedio, pedidosCancelados }
}

export async function getTopProductos(
  desde: string,
  hasta: string,
  limit = 10
): Promise<TopProducto[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('pedido_items(cantidad, precio_unitario, productos(nombre))')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  const mapa = new Map<string, TopProducto>()
  for (const pedido of (data ?? []) as any[]) {
    for (const item of (pedido.pedido_items ?? [])) {
      if (!item.productos) continue
      const nombre: string = item.productos.nombre
      const prev = mapa.get(nombre) ?? { nombre, cantidad: 0, totalVentas: 0 }
      mapa.set(nombre, {
        nombre,
        cantidad: prev.cantidad + item.cantidad,
        totalVentas: prev.totalVentas + item.precio_unitario * item.cantidad,
      })
    }
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limit)
}

export async function getVentasPorCategoria(
  desde: string,
  hasta: string
): Promise<VentaCategoria[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('pedido_items(cantidad, precio_unitario, productos(categorias(nombre)))')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  const mapa = new Map<string, VentaCategoria>()
  for (const pedido of (data ?? []) as any[]) {
    for (const item of (pedido.pedido_items ?? [])) {
      if (!item.productos?.categorias) continue
      const categoria: string = item.productos.categorias.nombre
      const prev = mapa.get(categoria) ?? { categoria, totalVentas: 0, cantidad: 0 }
      mapa.set(categoria, {
        categoria,
        totalVentas: prev.totalVentas + item.precio_unitario * item.cantidad,
        cantidad: prev.cantidad + item.cantidad,
      })
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.totalVentas - a.totalVentas)
}

export async function getEstadisticasMozos(
  desde: string,
  hasta: string
): Promise<EstadisticaMozo[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('mesa_id, mozo_id, profiles!mozo_id(nombre), pedido_items(precio_unitario, cantidad)')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  const mapa = new Map<
    string,
    { nombre: string; totalPedidos: number; totalVentas: number; mesas: Set<string> }
  >()

  for (const p of (data ?? []) as any[]) {
    if (!p.profiles) continue
    const nombre: string = p.profiles.nombre
    const prev = mapa.get(nombre) ?? { nombre, totalPedidos: 0, totalVentas: 0, mesas: new Set() }

    let ventas = 0
    for (const item of (p.pedido_items ?? [])) {
      ventas += item.precio_unitario * item.cantidad
    }

    if (p.mesa_id) prev.mesas.add(String(p.mesa_id))
    mapa.set(nombre, {
      nombre,
      totalPedidos: prev.totalPedidos + 1,
      totalVentas: prev.totalVentas + ventas,
      mesas: prev.mesas,
    })
  }

  return Array.from(mapa.values())
    .map(m => ({
      nombre: m.nombre,
      totalPedidos: m.totalPedidos,
      totalVentas: m.totalVentas,
      ticketPromedio: m.totalPedidos > 0 ? m.totalVentas / m.totalPedidos : 0,
      mesasAtendidas: m.mesas.size,
    }))
    .sort((a, b) => b.totalVentas - a.totalVentas)
}

export async function getVentasPorDia(desde: string, hasta: string): Promise<VentaDia[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('created_at, pedido_items(precio_unitario, cantidad)')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')
    .order('created_at', { ascending: true })

  if (error) throw error

  const mapa = new Map<string, { totalVentas: number; totalPedidos: number }>()
  for (const p of (data ?? []) as any[]) {
    const fecha: string = p.created_at.slice(0, 10)
    const prev = mapa.get(fecha) ?? { totalVentas: 0, totalPedidos: 0 }
    let ventas = 0
    for (const item of (p.pedido_items ?? [])) {
      ventas += item.precio_unitario * item.cantidad
    }
    mapa.set(fecha, { totalVentas: prev.totalVentas + ventas, totalPedidos: prev.totalPedidos + 1 })
  }

  return Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, vals]) => ({ fecha, ...vals }))
}

export async function getVentasPorHora(desde: string, hasta: string): Promise<VentaHora[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('created_at')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  const conteo = new Array(24).fill(0)
  for (const p of (data ?? []) as any[]) {
    const hora = new Date(p.created_at).getHours()
    conteo[hora]++
  }

  return conteo.map((totalPedidos, hora) => ({ hora, totalPedidos }))
}

// ─── Descuentos ─────────────────────────────────────────────────────────────

export interface DetalleDescuento {
  fecha: string
  mozo: string
  mesa: string
  descuentoPorcentaje: number
  descuentoMotivo: string | null
  montoDescontado: number
  totalPedido: number
}

export interface ResumenDescuentos {
  totalDescontado: number
  pedidosConDescuento: number
  porcentajePromedio: number
  detalle: DetalleDescuento[]
}

export async function getDescuentos(desde: string, hasta: string): Promise<ResumenDescuentos> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      'created_at, descuento_porcentaje, descuento_motivo, profiles!mozo_id(nombre), mesas(numero, nombre), pedido_items(precio_unitario, cantidad)'
    )
    .gt('descuento_porcentaje', 0)
    .neq('estado', 'cancelado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')
    .order('created_at', { ascending: false })

  if (error) throw error

  const detalle: DetalleDescuento[] = ((data ?? []) as any[]).map(p => {
    const totalPedido = (p.pedido_items ?? []).reduce(
      (s: number, item: any) => s + item.precio_unitario * item.cantidad,
      0
    )
    const mesa = p.mesas ? (p.mesas.nombre || `Mesa ${p.mesas.numero}`) : '-'
    return {
      fecha: p.created_at.slice(0, 10),
      mozo: p.profiles?.nombre ?? '-',
      mesa,
      descuentoPorcentaje: p.descuento_porcentaje,
      descuentoMotivo: p.descuento_motivo ?? null,
      montoDescontado: totalPedido * (p.descuento_porcentaje / 100),
      totalPedido,
    }
  })

  const totalDescontado = detalle.reduce((s, d) => s + d.montoDescontado, 0)
  const pedidosConDescuento = detalle.length
  const porcentajePromedio =
    pedidosConDescuento > 0
      ? detalle.reduce((s, d) => s + d.descuentoPorcentaje, 0) / pedidosConDescuento
      : 0

  return { totalDescontado, pedidosConDescuento, porcentajePromedio, detalle }
}

// ─── Tiempos de entrega por mozo ─────────────────────────────────────────────

export interface TiempoEntregaMozo {
  nombre: string
  tiempoPromedio: number
  cantidad: number
}

export async function getTiempoEntregaPorMozo(
  desde: string,
  hasta: string
): Promise<TiempoEntregaMozo[]> {
  const { data, error } = await supabase
    .from('pedido_panel_estados')
    .select('listo_at, updated_at, pedido:pedidos!inner(mozo_id, profiles!mozo_id(nombre))')
    .not('listo_at', 'is', null)
    .eq('estado', 'entregado')
    .gte('listo_at', desde)
    .lte('listo_at', hasta + 'T23:59:59')

  if (error) throw error

  const mapa = new Map<string, { total: number; count: number }>()
  for (const row of (data ?? []) as any[]) {
    if (!row.pedido?.profiles?.nombre) continue
    const nombre: string = row.pedido.profiles.nombre
    const min = (new Date(row.updated_at).getTime() - new Date(row.listo_at).getTime()) / 60000
    if (min <= 0 || min > 60) continue
    const prev = mapa.get(nombre) ?? { total: 0, count: 0 }
    mapa.set(nombre, { total: prev.total + min, count: prev.count + 1 })
  }

  return Array.from(mapa.entries())
    .map(([nombre, v]) => ({ nombre, tiempoPromedio: v.total / v.count, cantidad: v.count }))
    .sort((a, b) => a.tiempoPromedio - b.tiempoPromedio)
}

// ─── Tiempos cocina ──────────────────────────────────────────────────────────

export interface TiemposCocina {
  tiempoPromedioCocina: number
  tiempoPromedioMozo: number
  tiempoPromedioTotal: number
  porPanel: { panel: string; tiempoPromedio: number; cantidad: number }[]
  distribucion: DistribucionTiempo[]
}

export async function getTiemposCocina(desde: string, hasta: string): Promise<TiemposCocina> {
  const { data, error } = await supabase
    .from('pedido_panel_estados')
    .select('panel, listo_at, updated_at, pedido:pedidos!inner(created_at)')
    .not('listo_at', 'is', null)
    .eq('estado', 'entregado')
    .gte('listo_at', desde)
    .lte('listo_at', hasta + 'T23:59:59')

  if (error) throw error

  const ms = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000

  const rows = ((data ?? []) as any[])
    .filter(r => r.pedido && r.listo_at && r.updated_at)
    .map(r => ({
      panel: r.panel as string,
      tCocina: Math.max(0, ms(r.pedido.created_at, r.listo_at)),
      tMozo: Math.max(0, ms(r.listo_at, r.updated_at)),
      tTotal: Math.max(0, ms(r.pedido.created_at, r.updated_at)),
    }))
    .filter(r => r.tTotal > 0 && r.tTotal < 480)

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0

  const panelMap = new Map<string, { total: number; count: number }>()
  for (const r of rows) {
    const prev = panelMap.get(r.panel) ?? { total: 0, count: 0 }
    panelMap.set(r.panel, { total: prev.total + r.tCocina, count: prev.count + 1 })
  }

  const rangos = [
    { label: '0-10 min', min: 0, max: 10 },
    { label: '10-20 min', min: 10, max: 20 },
    { label: '20-30 min', min: 20, max: 30 },
    { label: '30-45 min', min: 30, max: 45 },
    { label: '45-60 min', min: 45, max: 60 },
    { label: '> 60 min', min: 60, max: Infinity },
  ]

  return {
    tiempoPromedioCocina: avg(rows.map(r => r.tCocina)),
    tiempoPromedioMozo: avg(rows.map(r => r.tMozo)),
    tiempoPromedioTotal: avg(rows.map(r => r.tTotal)),
    porPanel: Array.from(panelMap.entries()).map(([panel, v]) => ({
      panel,
      tiempoPromedio: v.total / v.count,
      cantidad: v.count,
    })),
    distribucion: rangos.map(r => ({
      rango: r.label,
      cantidad: rows.filter(t => t.tCocina >= r.min && t.tCocina < r.max).length,
    })),
  }
}

// ─── Tiempos ─────────────────────────────────────────────────────────────────

export interface TiempoMozo {
  nombre: string
  tiempoPromedio: number
  totalPedidos: number
}

export interface DistribucionTiempo {
  rango: string
  cantidad: number
}

export interface ResumenTiempos {
  tiempoPromedioPedido: number
  tiempoPromedioMesa: number
  tiempoPorMozo: TiempoMozo[]
  distribucion: DistribucionTiempo[]
}

// ─── Ítems eliminados ────────────────────────────────────────────────────────

export interface ItemEliminado {
  id: string
  productoNombre: string
  cantidad: number
  precioUnitario: number
  valorTotal: number
  mesaNombre: string | null
  cliente: string | null
  eliminadoPorNombre: string | null
  eliminadoAt: string
}

export async function getItemsEliminados(desde: string, hasta: string): Promise<ItemEliminado[]> {
  const { data, error } = await supabase
    .from('items_eliminados')
    .select('*')
    .gte('eliminado_at', desde + 'T00:00:00')
    .lte('eliminado_at', hasta + 'T23:59:59')
    .order('eliminado_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    productoNombre: row.producto_nombre,
    cantidad: row.cantidad,
    precioUnitario: row.precio_unitario,
    valorTotal: row.valor_total,
    mesaNombre: row.mesa_nombre,
    cliente: row.cliente,
    eliminadoPorNombre: row.eliminado_por_nombre,
    eliminadoAt: row.eliminado_at,
  }))
}

export async function getTiempos(desde: string, hasta: string): Promise<ResumenTiempos> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('created_at, updated_at, mesa_id, profiles!mozo_id(nombre)')
    .eq('estado', 'entregado')
    .gte('created_at', desde)
    .lte('created_at', hasta + 'T23:59:59')

  if (error) throw error

  // Tiempo por pedido: created_at → updated_at (momento en que se marcó entregado)
  // Se filtran outliers > 8 horas (operacional imposible)
  const tiempos = ((data ?? []) as any[])
    .map(p => {
      const min = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 60000
      return { min, mozo: p.profiles?.nombre ?? '-', mesa_id: p.mesa_id, created_at: p.created_at, updated_at: p.updated_at }
    })
    .filter(t => t.min > 0 && t.min < 480)

  const tiempoPromedioPedido =
    tiempos.length > 0 ? tiempos.reduce((s, t) => s + t.min, 0) / tiempos.length : 0

  // Tiempo por mozo
  const mozoMap = new Map<string, { total: number; count: number }>()
  for (const t of tiempos) {
    const prev = mozoMap.get(t.mozo) ?? { total: 0, count: 0 }
    mozoMap.set(t.mozo, { total: prev.total + t.min, count: prev.count + 1 })
  }
  const tiempoPorMozo: TiempoMozo[] = Array.from(mozoMap.entries())
    .map(([nombre, v]) => ({ nombre, tiempoPromedio: v.total / v.count, totalPedidos: v.count }))
    .sort((a, b) => b.totalPedidos - a.totalPedidos)

  // Distribución en rangos
  const rangos = [
    { label: '0-10 min', min: 0, max: 10 },
    { label: '10-20 min', min: 10, max: 20 },
    { label: '20-30 min', min: 20, max: 30 },
    { label: '30-45 min', min: 30, max: 45 },
    { label: '45-60 min', min: 45, max: 60 },
    { label: '> 60 min', min: 60, max: Infinity },
  ]
  const distribucion: DistribucionTiempo[] = rangos.map(r => ({
    rango: r.label,
    cantidad: tiempos.filter(t => t.min >= r.min && t.min < r.max).length,
  }))

  // Tiempo de mesa: agrupar pedidos por (mesa_id, fecha), medir duración de la sesión
  const sesionMap = new Map<string, { inicio: number; fin: number }>()
  for (const p of (data ?? []) as any[]) {
    if (!p.mesa_id) continue
    const key = `${p.mesa_id}-${p.created_at.slice(0, 10)}`
    const ini = new Date(p.created_at).getTime()
    const fin = new Date(p.updated_at).getTime()
    const prev = sesionMap.get(key)
    sesionMap.set(key, prev
      ? { inicio: Math.min(prev.inicio, ini), fin: Math.max(prev.fin, fin) }
      : { inicio: ini, fin }
    )
  }
  const sesiones = Array.from(sesionMap.values()).map(s => (s.fin - s.inicio) / 60000)
  const tiempoPromedioMesa =
    sesiones.length > 0 ? sesiones.reduce((s, t) => s + t, 0) / sesiones.length : 0

  return { tiempoPromedioPedido, tiempoPromedioMesa, tiempoPorMozo, distribucion }
}
