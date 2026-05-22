export type UserRole = 'admin' | 'cocina' | 'mozo' | 'recepcion'

export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'

export interface Profile {
  id: string
  nombre: string
  rol: UserRole
  activo: boolean
  created_at: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fila: number
  activo: boolean
  created_at: string
}

export interface Subcategoria {
  id: string
  categoria_key: string
  nombre: string
  orden: number
}

export interface Producto {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  categoria_id?: string
  disponible: boolean
  imagen_url?: string
  created_at: string
  subcategoria?: string
  panel?: 'cocina' | 'postres' | null
  categoria?: Categoria
}

export type MesaEstado = 'libre' | 'ocupada' | 'cuenta'

export type CategoriaHab = 'DPTO' | 'CAB' | 'EST' | 'SUP' | 'DLX' | 'AF'

export interface Mesa {
  id: string
  numero: number
  nombre: string
  categoria?: CategoriaHab
  cliente?: string
  activa: boolean
  estado: MesaEstado
  mozo_activo_id?: string
  abierta_at?: string
  created_at: string
  mozo_activo?: Profile
  numero_ticket?: number
  total_acumulado?: number
}

export interface PedidoItem {
  id: string
  pedido_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  notas?: string
  created_at: string
  producto?: Producto
}

export interface Pedido {
  id: string
  mesa_id: string
  mozo_id: string
  estado: OrderStatus
  notas?: string
  cliente?: string
  created_at: string
  updated_at: string
  numero_ticket?: number
  descuento_porcentaje?: number
  descuento_motivo?: string
  mesa?: Mesa
  mozo?: Profile
  items?: PedidoItem[]
  panel_estados?: PedidoPanelEstado[]
}

export interface PedidoPanelEstado {
  id: string
  pedido_id: string
  panel: 'cocina' | 'postres'
  estado: OrderStatus
  created_at: string
  updated_at: string
}

export interface NewPedidoItem {
  producto_id: string
  cantidad: number
  precio_unitario: number
  notas?: string
}

export interface CartItem {
  producto: Producto
  cantidad: number
  notas?: string
}
