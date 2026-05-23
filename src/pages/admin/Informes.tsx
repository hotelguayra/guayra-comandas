import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { Download } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import {
  getResumenVentas,
  getTopProductos,
  getVentasPorCategoria,
  getEstadisticasMozos,
  getVentasPorDia,
  getDescuentos,
  getTiempos,
  getTiemposCocina,
  getTiempoEntregaPorMozo,
  getVentasPorHora,
  getItemsEliminados,
  type ResumenVentas,
  type TopProducto,
  type VentaCategoria,
  type EstadisticaMozo,
  type VentaDia,
  type ResumenDescuentos,
  type ResumenTiempos,
  type TiemposCocina,
  type TiempoEntregaMozo,
  type VentaHora,
  type ItemEliminado,
} from '@/services/reports'

type Tab = 'resumen' | 'productos' | 'categorias' | 'mozos' | 'ventas' | 'descuentos' | 'tiempos' | 'horapico' | 'eliminados'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Top Productos' },
  { id: 'categorias', label: 'Por Categoría' },
  { id: 'mozos', label: 'Mozos' },
  { id: 'ventas', label: 'Ventas por día' },
  { id: 'descuentos', label: 'Descuentos' },
  { id: 'tiempos', label: 'Tiempos' },
  { id: 'horapico', label: 'Horas pico' },
  { id: 'eliminados', label: 'Eliminados' },
]

function exportarCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const str = String(cell)
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }
  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-tierra-muted border border-tierra/20 rounded-xl hover:border-tierra/40 hover:text-tierra transition-colors"
    >
      <Download size={13} />
      Exportar CSV
    </button>
  )
}

function primerDiaMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatPesos(valor: number): string {
  return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatMinutos(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${m}min`
}

function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00')
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  return `${dias[d.getDay()]} ${d.getDate()}`
}

function TabLoader() {
  return (
    <div className="flex justify-center items-center py-16">
      <Spinner size="lg" />
    </div>
  )
}

function TabVacio() {
  return (
    <div className="flex justify-center items-center py-16">
      <p className="text-tierra-muted text-sm">Sin datos para el período seleccionado</p>
    </div>
  )
}

function StatCard({
  titulo,
  valor,
  color,
}: {
  titulo: string
  valor: string
  color: 'jade' | 'bronceado' | 'tierra' | 'rubi'
}) {
  const colorClasses = {
    jade: 'text-jade border-jade/20 bg-jade/5',
    bronceado: 'text-bronceado border-bronceado/20 bg-bronceado/5',
    tierra: 'text-tierra border-tierra/20 bg-tierra/5',
    rubi: 'text-rubi-light border-rubi/20 bg-rubi/5',
  }
  return (
    <div className={clsx('rounded-xl border p-5', colorClasses[color])}>
      <p className="text-xs font-medium opacity-70 mb-2 uppercase tracking-wide">{titulo}</p>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  )
}

function TabResumen({ data, isLoading }: { data?: ResumenVentas; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data) return <TabVacio />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('resumen', ['Métrica', 'Valor'], [
          ['Total ventas', data.totalVentas],
          ['Pedidos entregados', data.totalPedidos],
          ['Ticket promedio', data.ticketPromedio.toFixed(2)],
          ['Cancelados', data.pedidosCancelados],
        ])} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Total ventas" valor={formatPesos(data.totalVentas)} color="jade" />
        <StatCard titulo="Pedidos entregados" valor={String(data.totalPedidos)} color="bronceado" />
        <StatCard titulo="Ticket promedio" valor={formatPesos(data.ticketPromedio)} color="tierra" />
        <StatCard titulo="Cancelados" valor={String(data.pedidosCancelados)} color="rubi" />
      </div>
    </div>
  )
}

function TabProductos({ data, isLoading }: { data?: TopProducto[]; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data || data.length === 0) return <TabVacio />

  const maxCantidad = data[0]?.cantidad ?? 1

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('top-productos', ['#', 'Producto', 'Cantidad', 'Total Ventas'], data.map((item, i) => [i + 1, item.nombre, item.cantidad, item.totalVentas]))} />
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tierra/10">
            <th className="text-left py-3 px-4 text-tierra-muted font-medium w-12">#</th>
            <th className="text-left py-3 px-4 text-tierra-muted font-medium">Producto</th>
            <th className="text-left py-3 px-4 text-tierra-muted font-medium">Cantidad vendida</th>
            <th className="text-right py-3 px-4 text-tierra-muted font-medium">Total generado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={item.nombre} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
              <td className="py-3 px-4 text-tierra-muted">{i + 1}</td>
              <td className="py-3 px-4 text-tierra font-medium">{item.nombre}</td>
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                  <span className="text-tierra">{item.cantidad}</span>
                  <div className="h-1.5 bg-bronceado/20 rounded-full w-full max-w-32">
                    <div
                      className="h-1.5 bg-bronceado rounded-full"
                      style={{ width: `${(item.cantidad / maxCantidad) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-tierra font-medium">
                {formatPesos(item.totalVentas)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function TabCategorias({ data, isLoading }: { data?: VentaCategoria[]; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data || data.length === 0) return <TabVacio />

  const maxVentas = data[0]?.totalVentas ?? 1

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('categorias', ['Categoría', 'Items', 'Total Ventas'], data.map(cat => [cat.categoria, cat.cantidad, cat.totalVentas]))} />
      </div>
      {data.map(cat => (
        <div
          key={cat.categoria}
          className="rounded-xl border border-tierra/10 bg-windsor-lighter/30 px-5 py-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-tierra font-semibold">{cat.categoria}</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-tierra-muted">{cat.cantidad} items</span>
              <span className="text-bronceado font-bold">{formatPesos(cat.totalVentas)}</span>
            </div>
          </div>
          <div className="h-2 bg-bronceado/15 rounded-full">
            <div
              className="h-2 bg-bronceado/60 rounded-full transition-all"
              style={{ width: `${(cat.totalVentas / maxVentas) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function TabMozos({
  data,
  isLoading,
  tiempos,
}: {
  data?: EstadisticaMozo[]
  isLoading: boolean
  tiempos?: TiempoEntregaMozo[]
}) {
  if (isLoading) return <TabLoader />
  if (!data || data.length === 0) return <TabVacio />

  const maxTiempo = tiempos && tiempos.length > 0
    ? Math.max(...tiempos.map(t => t.tiempoPromedio), 1)
    : 1

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('mozos', ['Mozo', 'Pedidos', 'Mesas', 'Total Ventas', 'Ticket Promedio'], (data ?? []).map(m => [m.nombre, m.totalPedidos, m.mesasAtendidas, m.totalVentas, m.ticketPromedio.toFixed(2)]))} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10">
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mozo</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Pedidos</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Mesas</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Total ventas</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Ticket prom.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((mozo, i) => (
              <tr
                key={mozo.nombre}
                className={clsx(
                  'border-b border-tierra/5 transition-colors',
                  i === 0 ? 'bg-bronceado/5' : 'hover:bg-windsor-lighter/50'
                )}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-tierra font-medium">{mozo.nombre}</span>
                    {i === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bronceado/20 text-bronceado font-semibold">
                        Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-tierra">{mozo.totalPedidos}</td>
                <td className="py-3 px-4 text-right text-tierra">{mozo.mesasAtendidas}</td>
                <td className="py-3 px-4 text-right text-tierra font-semibold">
                  {formatPesos(mozo.totalVentas)}
                </td>
                <td className="py-3 px-4 text-right text-tierra-muted">
                  {formatPesos(mozo.ticketPromedio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tiempos && tiempos.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs font-medium text-tierra-muted uppercase tracking-wide mb-3">
            Tiempo promedio de entrega — desde listo hasta entregado
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tierra/10">
                <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mozo</th>
                <th className="text-right py-3 px-4 text-tierra-muted font-medium">Pedidos</th>
                <th className="text-right py-3 px-4 text-tierra-muted font-medium">Tiempo prom.</th>
                <th className="py-3 px-4 text-tierra-muted font-medium w-36">Rapidez</th>
              </tr>
            </thead>
            <tbody>
              {tiempos.map((t, i) => (
                <tr
                  key={t.nombre}
                  className={clsx(
                    'border-b border-tierra/5 transition-colors',
                    i === 0 ? 'bg-jade/5' : 'hover:bg-windsor-lighter/50'
                  )}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-tierra font-medium">{t.nombre}</span>
                      {i === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-jade/20 text-jade font-semibold">
                          Más rápido
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-tierra-muted">{t.cantidad}</td>
                  <td className="py-3 px-4 text-right text-jade font-semibold">
                    {formatMinutos(t.tiempoPromedio)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-2 bg-jade/10 rounded-full">
                      <div
                        className="h-2 bg-jade/50 rounded-full"
                        style={{ width: `${(t.tiempoPromedio / maxTiempo) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabDescuentos({ data, isLoading }: { data?: ResumenDescuentos; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data || data.pedidosConDescuento === 0) return <TabVacio />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('descuentos', ['Fecha', 'Mozo', 'Mesa', 'Motivo', '%', 'Descontado', 'Total Pedido'], data.detalle.map(d => [d.fecha, d.mozo, d.mesa, d.descuentoMotivo ?? '', d.descuentoPorcentaje, d.montoDescontado.toFixed(2), d.totalPedido.toFixed(2)]))} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard titulo="Total descontado" valor={formatPesos(data.totalDescontado)} color="rubi" />
        <StatCard titulo="Pedidos con descuento" valor={String(data.pedidosConDescuento)} color="bronceado" />
        <StatCard titulo="Descuento promedio" valor={`${data.porcentajePromedio.toFixed(1)}%`} color="tierra" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10">
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Fecha</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mozo</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mesa</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Motivo</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">%</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Descontado</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Total pedido</th>
            </tr>
          </thead>
          <tbody>
            {data.detalle.map((d, i) => (
              <tr key={i} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                <td className="py-3 px-4 text-tierra-muted">{d.fecha}</td>
                <td className="py-3 px-4 text-tierra">{d.mozo}</td>
                <td className="py-3 px-4 text-tierra-muted">{d.mesa}</td>
                <td className="py-3 px-4 text-tierra-muted italic">
                  {d.descuentoMotivo || <span className="opacity-40">—</span>}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-rubi/10 text-rubi-light text-xs font-semibold">
                    {d.descuentoPorcentaje}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-rubi-light font-semibold">
                  -{formatPesos(d.montoDescontado)}
                </td>
                <td className="py-3 px-4 text-right text-tierra-muted">
                  {formatPesos(d.totalPedido)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabTiempos({
  cocina,
  general,
  isLoading,
}: {
  cocina?: TiemposCocina
  general?: ResumenTiempos
  isLoading: boolean
}) {
  if (isLoading) return <TabLoader />

  const sinDatosCocina = !cocina || cocina.tiempoPromedioTotal === 0
  const sinDatosGeneral = !general || (general.tiempoPromedioPedido === 0 && general.tiempoPromedioMesa === 0)

  if (sinDatosCocina && sinDatosGeneral) return <TabVacio />

  const maxDist = cocina
    ? Math.max(...cocina.distribucion.map(d => d.cantidad), 1)
    : 1

  return (
    <div className="space-y-6">
      {/* Tres tiempos segmentados */}
      {cocina && !sinDatosCocina && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              titulo="Tiempo cocina"
              valor={formatMinutos(cocina.tiempoPromedioCocina)}
              color="bronceado"
            />
            <StatCard
              titulo="Tiempo entrega mozo"
              valor={formatMinutos(cocina.tiempoPromedioMozo)}
              color="jade"
            />
            <StatCard
              titulo="Tiempo total"
              valor={formatMinutos(cocina.tiempoPromedioTotal)}
              color="tierra"
            />
          </div>

          {/* Desglose visual */}
          {cocina.tiempoPromedioTotal > 0 && (
            <div className="rounded-xl border border-tierra/10 bg-windsor-lighter/20 p-5">
              <p className="text-xs font-medium text-tierra-muted uppercase tracking-wide mb-3">
                Desglose del tiempo total promedio
              </p>
              <div className="flex h-6 rounded-full overflow-hidden gap-px">
                <div
                  className="bg-bronceado/70 flex items-center justify-center text-xs font-bold text-windsor transition-all"
                  style={{ width: `${(cocina.tiempoPromedioCocina / cocina.tiempoPromedioTotal) * 100}%` }}
                  title={`Cocina: ${formatMinutos(cocina.tiempoPromedioCocina)}`}
                >
                  {cocina.tiempoPromedioCocina / cocina.tiempoPromedioTotal > 0.15
                    ? formatMinutos(cocina.tiempoPromedioCocina)
                    : ''}
                </div>
                <div
                  className="bg-jade/60 flex items-center justify-center text-xs font-bold text-windsor transition-all"
                  style={{ width: `${(cocina.tiempoPromedioMozo / cocina.tiempoPromedioTotal) * 100}%` }}
                  title={`Mozo: ${formatMinutos(cocina.tiempoPromedioMozo)}`}
                >
                  {cocina.tiempoPromedioMozo / cocina.tiempoPromedioTotal > 0.15
                    ? formatMinutos(cocina.tiempoPromedioMozo)
                    : ''}
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-bronceado/70" />
                  <span className="text-xs text-tierra-muted">Cocina</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-jade/60" />
                  <span className="text-xs text-tierra-muted">Entrega mozo</span>
                </div>
              </div>
            </div>
          )}

          {/* Por panel */}
          {cocina.porPanel.length > 1 && (
            <div className="grid grid-cols-2 gap-4">
              {cocina.porPanel.map(p => (
                <div key={p.panel} className="rounded-xl border border-tierra/10 bg-windsor-lighter/20 p-4">
                  <p className="text-xs text-tierra-muted uppercase tracking-wide mb-1 capitalize">
                    {p.panel}
                  </p>
                  <p className="text-xl font-bold text-bronceado">{formatMinutos(p.tiempoPromedio)}</p>
                  <p className="text-xs text-tierra-muted mt-0.5">{p.cantidad} pedidos</p>
                </div>
              ))}
            </div>
          )}

          {/* Distribución */}
          <div className="rounded-xl border border-tierra/10 bg-windsor-lighter/20 p-5">
            <p className="text-xs font-medium text-tierra-muted uppercase tracking-wide mb-4">
              Distribución de tiempos de cocina
            </p>
            <div className="space-y-2.5">
              {cocina.distribucion.map(d => (
                <div key={d.rango} className="flex items-center gap-3">
                  <span className="text-xs text-tierra-muted w-20 shrink-0">{d.rango}</span>
                  <div className="flex-1 h-5 bg-bronceado/10 rounded-full overflow-hidden">
                    <div
                      className="h-5 bg-bronceado/50 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${(d.cantidad / maxDist) * 100}%` }}
                    >
                      {d.cantidad > 0 && (
                        <span className="text-xs font-semibold text-windsor">{d.cantidad}</span>
                      )}
                    </div>
                  </div>
                  {d.cantidad === 0 && (
                    <span className="text-xs text-tierra-muted opacity-40">0</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {sinDatosCocina && !sinDatosGeneral && general && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              titulo="Tiempo prom. pedido"
              valor={formatMinutos(general.tiempoPromedioPedido)}
              color="jade"
            />
            <StatCard
              titulo="Tiempo prom. mesa"
              valor={formatMinutos(general.tiempoPromedioMesa)}
              color="bronceado"
            />
          </div>
          <p className="text-xs text-tierra-muted text-center opacity-60">
            Los tiempos de cocina se registran a partir de ahora. Los datos históricos muestran tiempo total del pedido.
          </p>
          {general.tiempoPorMozo.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tierra/10">
                    <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mozo</th>
                    <th className="text-right py-3 px-4 text-tierra-muted font-medium">Pedidos</th>
                    <th className="text-right py-3 px-4 text-tierra-muted font-medium">Tiempo promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {general.tiempoPorMozo.map(m => (
                    <tr key={m.nombre} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                      <td className="py-3 px-4 text-tierra font-medium">{m.nombre}</td>
                      <td className="py-3 px-4 text-right text-tierra-muted">{m.totalPedidos}</td>
                      <td className="py-3 px-4 text-right text-jade font-semibold">
                        {formatMinutos(m.tiempoPromedio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabHoraPico({ data, isLoading }: { data?: VentaHora[]; isLoading: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (isLoading) return <TabLoader />
  if (!data || data.every(d => d.totalPedidos === 0)) return <TabVacio />

  const maxPedidos = Math.max(...data.map(d => d.totalPedidos), 1)
  const totalPedidos = data.reduce((s, d) => s + d.totalPedidos, 0)

  // Top 3 horas
  const top3 = [...data]
    .sort((a, b) => b.totalPedidos - a.totalPedidos)
    .slice(0, 3)
    .map(d => d.hora)

  const horaPico = data.reduce((best, d) => d.totalPedidos > best.totalPedidos ? d : best, data[0])

  const PAD = 40
  const W = 800
  const CHART_TOP = 15
  const CHART_BOT = 155
  const CHART_H = CHART_BOT - CHART_TOP
  const CHART_W = W - PAD * 2
  const LABEL_Y = 170
  const n = 24
  const barW = CHART_W / n - 3

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('horas-pico', ['Hora', 'Pedidos'], data.filter(d => d.totalPedidos > 0).sort((a, b) => b.totalPedidos - a.totalPedidos).map(d => [`${String(d.hora).padStart(2, '0')}:00`, d.totalPedidos]))} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          titulo="Hora pico"
          valor={`${horaPico.hora}:00`}
          color="bronceado"
        />
        <StatCard
          titulo="Pedidos en hora pico"
          valor={String(horaPico.totalPedidos)}
          color="jade"
        />
        <StatCard
          titulo="Total pedidos"
          valor={String(totalPedidos)}
          color="tierra"
        />
      </div>

      <div className="rounded-xl border border-tierra/10 bg-windsor-lighter/20 p-4">
        <p className="text-xs font-medium text-tierra-muted uppercase tracking-wide mb-4">
          Pedidos por hora del día
        </p>
        <svg viewBox="0 0 800 200" width="100%" className="overflow-visible">
          {/* Y-axis reference lines */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = CHART_BOT - frac * CHART_H
            return (
              <g key={i}>
                <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#d4c9b5" strokeWidth="0.5" strokeOpacity="0.2" />
                <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#d4c9b5" fillOpacity="0.5">
                  {Math.round(maxPedidos * frac)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = Math.max(d.totalPedidos > 0 ? (d.totalPedidos / maxPedidos) * CHART_H : 0, d.totalPedidos > 0 ? 2 : 0)
            const x = PAD + i * (CHART_W / n) + 1.5
            const y = CHART_BOT - barH
            const isTop = top3.includes(d.hora)
            const isHov = hovered === i

            return (
              <g key={d.hora}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="2"
                  fill={isHov ? '#b78c57' : isTop ? '#b78c57cc' : '#b78c5733'}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'default', transition: 'fill 0.15s' }}
                />
                {isHov && d.totalPedidos > 0 && (
                  <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="#b78c57">
                    {d.totalPedidos}
                  </text>
                )}
                {/* Label cada 3 horas */}
                {i % 3 === 0 && (
                  <text x={x + barW / 2} y={LABEL_Y} textAnchor="middle" fontSize="9" fill="#d4c9b5" fillOpacity="0.6">
                    {d.hora}h
                  </text>
                )}
              </g>
            )
          })}

          {/* X-axis */}
          <line x1={PAD} y1={CHART_BOT} x2={W - PAD} y2={CHART_BOT} stroke="#d4c9b5" strokeWidth="0.5" strokeOpacity="0.3" />
        </svg>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-bronceado/80" />
            <span className="text-xs text-tierra-muted">Top 3 horas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-bronceado/20" />
            <span className="text-xs text-tierra-muted">Resto</span>
          </div>
        </div>
      </div>

      {/* Tabla de horas con actividad */}
      <div className="overflow-x-auto">
        <p className="text-xs font-medium text-tierra-muted uppercase tracking-wide mb-3">
          Detalle por hora
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10">
              <th className="text-left py-2 px-4 text-tierra-muted font-medium">Hora</th>
              <th className="text-right py-2 px-4 text-tierra-muted font-medium">Pedidos</th>
              <th className="text-right py-2 px-4 text-tierra-muted font-medium">% del total</th>
              <th className="py-2 px-4 text-tierra-muted font-medium w-40">Actividad</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter(d => d.totalPedidos > 0)
              .sort((a, b) => b.totalPedidos - a.totalPedidos)
              .map((d, i) => (
                <tr
                  key={d.hora}
                  className={clsx(
                    'border-b border-tierra/5 transition-colors',
                    i < 3 ? 'bg-bronceado/5' : 'hover:bg-windsor-lighter/50'
                  )}
                >
                  <td className="py-2 px-4 font-medium text-tierra">
                    {String(d.hora).padStart(2, '0')}:00 — {String(d.hora + 1).padStart(2, '0')}:00
                    {i === 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-bronceado/20 text-bronceado font-semibold">
                        Pico
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right text-tierra">{d.totalPedidos}</td>
                  <td className="py-2 px-4 text-right text-tierra-muted">
                    {totalPedidos > 0 ? ((d.totalPedidos / totalPedidos) * 100).toFixed(1) : 0}%
                  </td>
                  <td className="py-2 px-4">
                    <div className="h-2 bg-bronceado/10 rounded-full">
                      <div
                        className="h-2 bg-bronceado/60 rounded-full"
                        style={{ width: `${(d.totalPedidos / maxPedidos) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabEliminados({ data, isLoading }: { data?: ItemEliminado[]; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data || data.length === 0) return <TabVacio />

  const totalValor = data.reduce((s, r) => s + r.valorTotal, 0)
  const totalItems = data.reduce((s, r) => s + r.cantidad, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('items-eliminados', ['Fecha', 'Producto', 'Cant.', 'Precio Unit.', 'Total', 'Mesa', 'Cliente', 'Eliminado por'], data.map(r => [new Date(r.eliminadoAt).toLocaleString('es-AR'), r.productoNombre, r.cantidad, r.precioUnitario, r.valorTotal, r.mesaNombre ?? '', r.cliente ?? '', r.eliminadoPorNombre ?? '']))} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard titulo="Ítems eliminados" valor={String(data.length)} color="rubi" />
        <StatCard titulo="Unidades quitadas" valor={String(totalItems)} color="bronceado" />
        <StatCard titulo="Valor eliminado" valor={formatPesos(totalValor)} color="tierra" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10">
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Fecha y hora</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Producto</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Cant.</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Precio unit.</th>
              <th className="text-right py-3 px-4 text-tierra-muted font-medium">Total</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Mesa</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Cliente</th>
              <th className="text-left py-3 px-4 text-tierra-muted font-medium">Eliminado por</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                <td className="py-3 px-4 text-tierra-muted text-xs whitespace-nowrap">
                  {new Date(row.eliminadoAt).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="py-3 px-4 text-tierra font-medium">{row.productoNombre}</td>
                <td className="py-3 px-4 text-right text-tierra-muted">{row.cantidad}</td>
                <td className="py-3 px-4 text-right text-tierra-muted">{formatPesos(row.precioUnitario)}</td>
                <td className="py-3 px-4 text-right">
                  <span className="text-rubi-light font-semibold">{formatPesos(row.valorTotal)}</span>
                </td>
                <td className="py-3 px-4 text-tierra-muted">{row.mesaNombre ?? '—'}</td>
                <td className="py-3 px-4 text-tierra-muted">{row.cliente ?? '—'}</td>
                <td className="py-3 px-4 text-tierra-muted">{row.eliminadoPorNombre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-tierra/20">
              <td colSpan={4} className="py-3 px-4 text-tierra-muted text-sm font-medium">Total del período</td>
              <td className="py-3 px-4 text-right text-rubi-light font-bold">{formatPesos(totalValor)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function GraficoBarras({ datos }: { datos: VentaDia[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (datos.length === 0) return <TabVacio />

  const PAD = 40
  const W = 800
  const CHART_TOP = 15
  const CHART_BOT = 155
  const CHART_H = CHART_BOT - CHART_TOP
  const LABEL_Y = 172
  const CHART_W = W - PAD * 2

  const n = datos.length
  const barW = Math.max(CHART_W / n - 4, 2)

  const maxVentas = Math.max(...datos.map(d => d.totalVentas), 1)
  const avgVentas = datos.reduce((s, d) => s + d.totalVentas, 0) / n
  const avgY = CHART_BOT - (avgVentas / maxVentas) * CHART_H

  const yTicks = [0, 0.33, 0.66, 1].map(frac => ({
    y: CHART_BOT - frac * CHART_H,
    val: maxVentas * frac,
  }))

  const rotateLabels = n > 14

  return (
    <div className={clsx('w-full', rotateLabels ? 'pb-10' : 'pb-2')}>
      <svg viewBox="0 0 800 200" width="100%" className="overflow-visible">
        {/* Y-axis reference lines + labels */}
        {yTicks.map(({ y, val }, i) => (
          <g key={i}>
            <line
              x1={PAD}
              y1={y}
              x2={W - PAD}
              y2={y}
              stroke="#d4c9b5"
              strokeWidth="0.5"
              strokeOpacity="0.25"
            />
            <text
              x={PAD - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#d4c9b5"
              fillOpacity="0.55"
            >
              {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
            </text>
          </g>
        ))}

        {/* Average dashed line */}
        <line
          x1={PAD}
          y1={avgY}
          x2={W - PAD}
          y2={avgY}
          stroke="#8baea7"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeOpacity="0.75"
        />
        <text x={W - PAD + 4} y={avgY + 4} fontSize="8" fill="#8baea7" fillOpacity="0.75">
          prom.
        </text>

        {/* Bars */}
        {datos.map((d, i) => {
          const barH = Math.max(
            d.totalVentas > 0 ? (d.totalVentas / maxVentas) * CHART_H : 0,
            d.totalVentas > 0 ? 2 : 0
          )
          const x = PAD + i * (CHART_W / n) + 2
          const y = CHART_BOT - barH
          const isHov = hovered === i

          return (
            <g key={d.fecha}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="2"
                fill={isHov ? '#b78c57' : '#b78c5799'}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default', transition: 'fill 0.15s' }}
              />
              {isHov && barH > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#b78c57"
                >
                  {formatPesos(d.totalVentas)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={LABEL_Y}
                textAnchor={rotateLabels ? 'end' : 'middle'}
                fontSize="8"
                fill="#d4c9b5"
                fillOpacity="0.65"
                transform={
                  rotateLabels
                    ? `rotate(-45, ${x + barW / 2}, ${LABEL_Y})`
                    : undefined
                }
              >
                {formatFechaCorta(d.fecha)}
              </text>
            </g>
          )
        })}

        {/* X-axis line */}
        <line
          x1={PAD}
          y1={CHART_BOT}
          x2={W - PAD}
          y2={CHART_BOT}
          stroke="#d4c9b5"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
      </svg>
    </div>
  )
}

function TabVentasDia({ data, isLoading }: { data?: VentaDia[]; isLoading: boolean }) {
  if (isLoading) return <TabLoader />
  if (!data || data.length === 0) return <TabVacio />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onClick={() => exportarCSV('ventas-por-dia', ['Fecha', 'Pedidos', 'Ventas'], data.map(d => [d.fecha, d.totalPedidos, d.totalVentas]))} />
      </div>
      <div className="rounded-xl border border-tierra/10 bg-windsor-lighter/20 p-4">
        <GraficoBarras datos={data} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10">
              <th className="text-left py-2 px-4 text-tierra-muted font-medium">Fecha</th>
              <th className="text-right py-2 px-4 text-tierra-muted font-medium">Pedidos</th>
              <th className="text-right py-2 px-4 text-tierra-muted font-medium">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.fecha} className="border-b border-tierra/5 hover:bg-windsor-lighter/50 transition-colors">
                <td className="py-2 px-4 text-tierra">{formatFechaCorta(d.fecha)}</td>
                <td className="py-2 px-4 text-right text-tierra-muted">{d.totalPedidos}</td>
                <td className="py-2 px-4 text-right text-tierra font-medium">
                  {formatPesos(d.totalVentas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminInformes() {
  const [desde, setDesde] = useState(primerDiaMes())
  const [hasta, setHasta] = useState(hoy())
  const [rango, setRango] = useState({ desde: primerDiaMes(), hasta: hoy() })
  const [tabActiva, setTabActiva] = useState<Tab>('resumen')
  const queryClient = useQueryClient()

  useEffect(() => {
    localStorage.setItem('informes-eliminados-seen-at', new Date().toISOString())
    queryClient.invalidateQueries({ queryKey: ['items-eliminados-hoy'] })
  }, [queryClient])

  const queryOpts = { staleTime: 60000 }

  const resumenQuery = useQuery({
    queryKey: ['informes-resumen', rango.desde, rango.hasta],
    queryFn: () => getResumenVentas(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const productosQuery = useQuery({
    queryKey: ['informes-top-productos', rango.desde, rango.hasta],
    queryFn: () => getTopProductos(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const categoriasQuery = useQuery({
    queryKey: ['informes-categorias', rango.desde, rango.hasta],
    queryFn: () => getVentasPorCategoria(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const mozosQuery = useQuery({
    queryKey: ['informes-mozos', rango.desde, rango.hasta],
    queryFn: () => getEstadisticasMozos(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const mozosTimesQuery = useQuery({
    queryKey: ['informes-mozos-tiempos', rango.desde, rango.hasta],
    queryFn: () => getTiempoEntregaPorMozo(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const ventasDiaQuery = useQuery({
    queryKey: ['informes-ventas-dia', rango.desde, rango.hasta],
    queryFn: () => getVentasPorDia(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const descuentosQuery = useQuery({
    queryKey: ['informes-descuentos', rango.desde, rango.hasta],
    queryFn: () => getDescuentos(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const tiemposQuery = useQuery({
    queryKey: ['informes-tiempos', rango.desde, rango.hasta],
    queryFn: () => getTiempos(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const tiemposCocinaQuery = useQuery({
    queryKey: ['informes-tiempos-cocina', rango.desde, rango.hasta],
    queryFn: () => getTiemposCocina(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const horaPicoQuery = useQuery({
    queryKey: ['informes-hora-pico', rango.desde, rango.hasta],
    queryFn: () => getVentasPorHora(rango.desde, rango.hasta),
    ...queryOpts,
  })

  const eliminadosQuery = useQuery({
    queryKey: ['informes-eliminados', rango.desde, rango.hasta],
    queryFn: () => getItemsEliminados(rango.desde, rango.hasta),
    ...queryOpts,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-tierra">Informes y estadísticas</h1>
          <p className="text-tierra-muted text-sm mt-1">Análisis del período seleccionado</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-tierra-muted">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
              className="bg-windsor-lighter border border-tierra/20 text-tierra rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-tierra-muted">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
              className="bg-windsor-lighter border border-tierra/20 text-tierra rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setRango({ desde, hasta })}
            className="px-4 py-2 bg-bronceado text-windsor font-semibold rounded-xl text-sm hover:bg-bronceado/90 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-tierra/10 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                tabActiva === tab.id
                  ? 'border-bronceado text-bronceado'
                  : 'border-transparent text-tierra-muted hover:text-tierra'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tabActiva === 'resumen' && (
          <TabResumen data={resumenQuery.data} isLoading={resumenQuery.isLoading} />
        )}
        {tabActiva === 'productos' && (
          <TabProductos data={productosQuery.data} isLoading={productosQuery.isLoading} />
        )}
        {tabActiva === 'categorias' && (
          <TabCategorias data={categoriasQuery.data} isLoading={categoriasQuery.isLoading} />
        )}
        {tabActiva === 'mozos' && (
          <TabMozos
            data={mozosQuery.data}
            isLoading={mozosQuery.isLoading || mozosTimesQuery.isLoading}
            tiempos={mozosTimesQuery.data}
          />
        )}
        {tabActiva === 'ventas' && (
          <TabVentasDia data={ventasDiaQuery.data} isLoading={ventasDiaQuery.isLoading} />
        )}
        {tabActiva === 'descuentos' && (
          <TabDescuentos data={descuentosQuery.data} isLoading={descuentosQuery.isLoading} />
        )}
        {tabActiva === 'tiempos' && (
          <TabTiempos
            cocina={tiemposCocinaQuery.data}
            general={tiemposQuery.data}
            isLoading={tiemposQuery.isLoading || tiemposCocinaQuery.isLoading}
          />
        )}
        {tabActiva === 'horapico' && (
          <TabHoraPico data={horaPicoQuery.data} isLoading={horaPicoQuery.isLoading} />
        )}
        {tabActiva === 'eliminados' && (
          <TabEliminados data={eliminadosQuery.data} isLoading={eliminadosQuery.isLoading} />
        )}
      </div>
    </div>
  )
}
