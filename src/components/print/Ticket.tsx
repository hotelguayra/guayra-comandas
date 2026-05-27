import { createPortal } from 'react-dom'
import type { Mesa, Pedido } from '@/types'

interface TicketProps {
  numeroTicket?: number
  mesa: Mesa
  pedidos: Pedido[]
  descuentoPorcentaje: number
  descuentoMotivo: string
  subtotal: number
  descuentoMonto: number
  total: number
  fechaImpresion: Date
}

const PRINT_STYLE = `
  @media print {
    body > *:not(#ticket-root) { display: none !important; }
    #ticket-root { display: block !important; }
    @page { margin: 4mm; size: 80mm auto; }
  }
`

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function TicketCopy({
  numeroTicket,
  mesa,
  pedidos,
  descuentoPorcentaje,
  descuentoMotivo,
  subtotal,
  descuentoMonto,
  total,
  fechaImpresion,
}: TicketProps) {
  const fecha = fechaImpresion.toLocaleDateString('es-AR')
  const hora = fechaImpresion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const mesaLabel = `${mesa.categoria ?? ''}-${mesa.numero}`
  const ticketNum = String(numeroTicket ?? 0).padStart(5, '0')
  const lastMozo = [...pedidos].reverse().find(p => p.mozo?.rol === 'mozo')?.mozo

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '72mm', padding: '4px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <img
          src="/logoC.png"
          alt="Guayra"
          style={{ width: '38mm', height: 'auto', display: 'block', margin: '0 auto' }}
        />
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '3px 0' }} />  
      <div>Ticket N°: {ticketNum}</div>
      <div>Fecha: {fecha}  Hora: {hora}</div>
      <div>Mesa: {mesaLabel}</div>
      <div>Cliente: {mesa.cliente ?? '-'}</div>
      <div>Mozo: {lastMozo?.nombre ?? '-'}</div>
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />
      <div style={{ fontWeight: 'bold', marginBottom: '2px', textAlign: 'center' }}>DETALLE:</div>
      {pedidos.map((pedido) =>
        (pedido.items ?? []).map((item) => {
          const nombre = item.producto?.nombre ?? 'Producto'
          const itemTotal = item.cantidad * item.precio_unitario
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '2px' }}>
              <span style={{ flexShrink: 0, marginRight: '8px' }}>&nbsp;&nbsp;{item.cantidad}x</span>
              <span style={{ flex: 1, wordBreak: 'break-word', paddingRight: '4px' }}>{nombre}</span>
              <span style={{ flexShrink: 0 }}>{fmt(itemTotal)}</span>
            </div>
          )
        })
      )}
      <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '3px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Subtotal:</span>
        <span>{fmt(subtotal)}</span>
      </div>
      {descuentoPorcentaje > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Desc. {descuentoPorcentaje}% {descuentoMotivo}:</span>
          <span>-{fmt(descuentoMonto)}</span>
        </div>
      )}
      <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '3px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
        <span>TOTAL:</span>
        <span>{fmt(total)}</span>
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '3px 0' }} />
      <div style={{ textAlign: 'center', marginTop: '4px' }}>Gracias por su visita</div>
      <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '3px 0' }} />
    </div>
  )
}

export function Ticket(props: TicketProps) {
  return createPortal(
    <>
      <style>{PRINT_STYLE}</style>
      <div id="ticket-root" style={{ display: 'none' }}>
        <TicketCopy {...props} />
      </div>
    </>,
    document.body
  )
}
