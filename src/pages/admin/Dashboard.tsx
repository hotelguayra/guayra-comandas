import { useQuery } from '@tanstack/react-query'
import { getAllPedidos } from '@/services/orders'
import { getAllProductos } from '@/services/products'
import { getAllMesas } from '@/services/tables'
import { getAllProfiles } from '@/services/users'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/Badge'
import { ClipboardList, Package, Table2, Users, TrendingUp, Clock } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-tierra-muted text-sm">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="font-heading text-3xl text-tierra-light">{value}</p>
    </div>
  )
}

export function AdminDashboard() {
  const { data: pedidos, isLoading: loadingPedidos } = useQuery({
    queryKey: ['all-pedidos'],
    queryFn: () => getAllPedidos(100),
    refetchInterval: 30000,
  })

  const { data: productos } = useQuery({ queryKey: ['all-productos'], queryFn: getAllProductos })
  const { data: mesas } = useQuery({ queryKey: ['all-mesas'], queryFn: getAllMesas })
  const { data: profiles } = useQuery({ queryKey: ['all-profiles'], queryFn: getAllProfiles })

  const pedidosHoy = pedidos?.filter((p) => {
    const today = new Date()
    const created = new Date(p.created_at)
    return created.toDateString() === today.toDateString()
  }) ?? []

  const totalHoy = pedidosHoy.reduce((acc, p) => {
    return acc + (p.items?.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) ?? 0)
  }, 0)

  const pendientes = pedidos?.filter((p) => p.estado === 'pendiente').length ?? 0
  const enPreparacion = pedidos?.filter((p) => p.estado === 'en_preparacion').length ?? 0

  if (loadingPedidos) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-tierra-light mb-1">Dashboard</h1>
        <p className="text-tierra-muted text-sm">Resumen de actividad del día</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pedidos hoy"
          value={pedidosHoy.length}
          icon={ClipboardList}
          color="bg-bronceado/10 text-bronceado"
        />
        <StatCard
          label="Venta del día"
          value={`$${totalHoy.toFixed(0)}`}
          icon={TrendingUp}
          color="bg-jade/10 text-jade"
        />
        <StatCard
          label="Pendientes"
          value={pendientes + enPreparacion}
          icon={Clock}
          color="bg-rubi/10 text-rubi-light"
        />
        <StatCard
          label="Productos activos"
          value={productos?.filter((p) => p.disponible).length ?? 0}
          icon={Package}
          color="bg-tierra/10 text-tierra"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-heading text-sm text-tierra-muted uppercase tracking-widest mb-4">Mesas</h3>
          <p className="font-heading text-4xl text-tierra-light">{mesas?.filter(m => m.activa).length ?? 0}</p>
          <p className="text-tierra-muted text-xs mt-1">activas de {mesas?.length ?? 0} total</p>
        </div>
        <div className="card p-5">
          <h3 className="font-heading text-sm text-tierra-muted uppercase tracking-widest mb-4">Usuarios</h3>
          <p className="font-heading text-4xl text-tierra-light">{profiles?.length ?? 0}</p>
          <p className="text-tierra-muted text-xs mt-1">en el sistema</p>
        </div>
        <div className="card p-5">
          <h3 className="font-heading text-sm text-tierra-muted uppercase tracking-widest mb-4">Productos</h3>
          <p className="font-heading text-4xl text-tierra-light">{productos?.length ?? 0}</p>
          <p className="text-tierra-muted text-xs mt-1">en el menú</p>
        </div>
      </div>

      {/* Últimos pedidos */}
      <div>
        <h3 className="font-heading text-base text-tierra-muted uppercase tracking-widest mb-4">
          Últimos pedidos
        </h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tierra/10">
                  <th className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">Mesa</th>
                  <th className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">Mozo</th>
                  <th className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">Items</th>
                  <th className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">Estado</th>
                  <th className="text-left px-5 py-3 text-tierra-muted text-xs uppercase tracking-wider font-body">Hora</th>
                </tr>
              </thead>
              <tbody>
                {pedidos?.slice(0, 10).map((pedido) => (
                  <tr key={pedido.id} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                    <td className="px-5 py-3 text-tierra font-bold text-sm">Mesa {pedido.mesa?.numero}</td>
                    <td className="px-5 py-3 text-tierra-muted text-sm">{pedido.mozo?.nombre}</td>
                    <td className="px-5 py-3 text-tierra-muted text-sm">{pedido.items?.length ?? 0}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={pedido.estado} />
                    </td>
                    <td className="px-5 py-3 text-tierra-muted text-xs">
                      {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
