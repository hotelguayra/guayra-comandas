import { type ReactNode, useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, Bell, ChefHat, PlusCircle, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NotificacionesProvider, useNotificaciones } from '@/contexts/NotificacionesContext'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { ToastContainer, type ToastItem } from '@/components/ui/Toast'

interface MozoLayoutProps {
  children: ReactNode
}

function MozoNav() {
  const { mesasRecibidas } = useNotificaciones()
  return (
    <nav className="glass border-t border-tierra/10 sticky bottom-0 z-40">
      <div className="max-w-lg mx-auto flex">
        <NavLink
          to="/mozo"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-bronceado' : 'text-tierra-muted hover:text-tierra'
            }`
          }
        >
          <Home size={20} />
          Mesas
        </NavLink>
        <NavLink
          to="/mozo/mis-pedidos"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-bronceado' : 'text-tierra-muted hover:text-tierra'
            }`
          }
        >
          <div className="relative">
            <ClipboardList size={20} />
            {mesasRecibidas > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 bg-rubi text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {mesasRecibidas > 9 ? '9+' : mesasRecibidas}
              </span>
            )}
          </div>
          Mis Pedidos
        </NavLink>
      </div>
    </nav>
  )
}

function MozoHeader() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { count: listosCount, pedidosListos, acknowledge, pedidosDeRecepcion, acknowledgeRecepcion, mesasTransferidas, acknowledgeTransferencias } = useNotificaciones()
  const [bellOpen, setBellOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const seenRecepcionRef = useRef<Set<string>>(new Set())

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const currentIds = new Set(pedidosListos.map((p) => p.mesa_id))

    // Liberar mesas que ya no están listas para que puedan tostar de nuevo
    seenRef.current.forEach((id) => {
      if (!currentIds.has(id)) seenRef.current.delete(id)
    })

    const nuevos = pedidosListos.filter((p) => !seenRef.current.has(p.mesa_id))
    nuevos.forEach((p) => seenRef.current.add(p.mesa_id))

    if (nuevos.length > 0) {
      setToasts((prev) => [
        ...prev,
        ...nuevos.map((p) => ({ id: `${p.mesa_id}-${Date.now()}`, mesaNombre: p.mesaNombre, cliente: p.cliente })),
      ])
    }
  }, [pedidosListos])

  useEffect(() => {
    const nuevos = pedidosDeRecepcion.filter((p) => !seenRecepcionRef.current.has(p.mesa_id))
    nuevos.forEach((p) => seenRecepcionRef.current.add(p.mesa_id))
    if (nuevos.length > 0) {
      setToasts((prev) => [
        ...prev,
        ...nuevos.map((p) => ({
          id: `recepcion-${p.mesa_id}-${Date.now()}`,
          mesaNombre: p.mesaNombre,
          cliente: p.cliente,
          tipo: 'recepcion' as const,
          mesa_id: p.mesa_id,
        })),
      ])
    }
  }, [pedidosDeRecepcion])

  const handleMesaClick = (mesaId: string) => {
    acknowledge(mesaId)
    setBellOpen(false)
    navigate('/mozo/mis-pedidos', { state: { mesaId } })
  }

  return (
    <>
    <ToastContainer
      toasts={toasts}
      onDismiss={dismissToast}
      onNavigate={(mesaId) => { acknowledgeRecepcion(mesaId); navigate('/mozo/mis-pedidos', { state: { mesaId } }) }}
    />
    <header className="glass border-b border-tierra/10 px-4 py-3 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-tierra text-sm font-medium">{profile?.nombre}</span>

          <div className="relative">
            {(() => {
              const totalBell = listosCount + pedidosDeRecepcion.length + (mesasTransferidas.length > 0 ? 1 : 0)
              return (
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="relative p-2 rounded-xl hover:bg-windsor-lighter text-tierra-muted transition-colors"
                  title="Notificaciones"
                >
                  <Bell size={18} className={totalBell > 0 ? 'text-jade' : ''} />
                  {totalBell > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rubi text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {totalBell > 9 ? '9+' : totalBell}
                    </span>
                  )}
                </button>
              )
            })()}

            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 z-50 card shadow-xl overflow-hidden animate-fade-in">

                  {/* Listos para retirar */}
                  <div className="px-4 py-2 border-b border-tierra/10">
                    <p className="text-tierra-muted text-[10px] font-bold uppercase tracking-widest">Listos para retirar</p>
                  </div>
                  {pedidosListos.length === 0 ? (
                    <p className="text-tierra-muted text-xs text-center py-3 px-4">Sin pedidos listos</p>
                  ) : (
                    <div className="py-1">
                      {pedidosListos.map((p) => (
                        <button key={p.mesa_id} onClick={() => handleMesaClick(p.mesa_id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-windsor-lighter transition-colors text-left">
                          <ChefHat size={14} className="text-jade flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-jade font-bold text-sm leading-tight">{p.mesaNombre}</p>
                            {p.cliente && <p className="text-tierra-muted text-xs truncate uppercase">{p.cliente}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recepción agregó */}
                  {pedidosDeRecepcion.length > 0 && (
                    <>
                      <div className="px-4 py-2 border-t border-tierra/10">
                        <p className="text-tierra-muted text-[10px] font-bold uppercase tracking-widest">Recepción agregó</p>
                      </div>
                      <div className="py-1">
                        {pedidosDeRecepcion.map((p) => (
                          <button key={p.mesa_id}
                            onClick={() => { acknowledgeRecepcion(p.mesa_id); setBellOpen(false); navigate('/mozo/mis-pedidos', { state: { mesaId: p.mesa_id } }) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-windsor-lighter transition-colors text-left">
                            <PlusCircle size={14} className="text-bronceado flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-bronceado font-bold text-sm leading-tight">{p.mesaNombre}</p>
                              {p.cliente && <p className="text-tierra-muted text-xs truncate uppercase">{p.cliente}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Mesas transferidas — una sola notif con todas */}
                  {mesasTransferidas.length > 0 && (
                    <>
                      <div className="px-4 py-2 border-t border-tierra/10">
                        <p className="text-tierra-muted text-[10px] font-bold uppercase tracking-widest">Mesas recibidas</p>
                      </div>
                      <button
                        onClick={() => { acknowledgeTransferencias(); setBellOpen(false); navigate('/mozo/mis-pedidos') }}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-windsor-lighter transition-colors text-left">
                        <ArrowRightLeft size={14} className="text-tierra flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-tierra font-bold text-sm leading-tight">
                            {mesasTransferidas.map(m => m.mesaNombre).join(', ')}
                          </p>
                          <p className="text-tierra-muted text-xs mt-0.5">
                            {mesasTransferidas.length} mesa{mesasTransferidas.length !== 1 ? 's' : ''} asignada{mesasTransferidas.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    </>
                  )}

                </div>
              </>
            )}
          </div>

          <LogoutButton iconOnly className="p-2 rounded-xl hover:bg-windsor-lighter text-tierra-muted transition-colors" />
        </div>
      </div>
    </header>
    </>
  )
}

export function MozoLayout({ children }: MozoLayoutProps) {
  const { profile } = useAuth()

  return (
    <NotificacionesProvider mozoId={profile?.id}>
      <div className="min-h-screen bg-windsor flex flex-col">
        <MozoHeader />

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
          {children}
        </main>

        <MozoNav />
      </div>
    </NotificacionesProvider>
  )
}
