import { createContext, useContext, type ReactNode } from 'react'
import { useNotificacionesListos, type PedidoListo } from '@/hooks/useNotificacionesListos'

interface NotificacionesCtx {
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

const NotificacionesContext = createContext<NotificacionesCtx>({
  count: 0,
  mesasListas: new Set(),
  pedidosListos: [],
  acknowledge: () => {},
  mesasRecibidas: 0,
  mesasTransferidas: [],
  acknowledgeTransferencias: () => {},
  pedidosDeRecepcion: [],
  acknowledgeRecepcion: () => {},
})

export function NotificacionesProvider({
  children,
  mozoId,
}: {
  children: ReactNode
  mozoId: string | undefined
}) {
  const value = useNotificacionesListos(mozoId)
  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export function useNotificaciones() {
  return useContext(NotificacionesContext)
}
