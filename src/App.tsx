import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { subscribePush } from '@/services/push'
import { usePushNotifications } from '@/hooks/usePushNotifications'

import { Login } from '@/pages/Login'

import { MozoLayout } from '@/layouts/MozoLayout'
import { MesaSelector } from '@/pages/mozo/MesaSelector'
import { NuevoPedido } from '@/pages/mozo/NuevoPedido'
import { MisPedidos } from '@/pages/mozo/MisPedidos'

import { KitchenDisplay } from '@/pages/kitchen/KitchenDisplay'
import { PostresDisplay } from '@/pages/kitchen/PostresDisplay'

import { RecepcionLayout } from '@/layouts/RecepcionLayout'
import { MesasEnVivo } from '@/pages/recepcion/MesasEnVivo'
import { Historial } from '@/pages/recepcion/Historial'
import { AdminDashboard as RecepcionDashboard } from '@/pages/admin/Dashboard'
import { AdminProductos as RecepcionProductos } from '@/pages/admin/Productos'
import { AdminCategorias as RecepcionCategorias } from '@/pages/admin/Categorias'
import { AdminSubcategorias as RecepcionSubcategorias } from '@/pages/admin/Subcategorias'
import { AdminMesas as RecepcionMesas } from '@/pages/admin/Mesas'

import { AdminLayout } from '@/layouts/AdminLayout'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminProductos } from '@/pages/admin/Productos'
import { AdminCategorias } from '@/pages/admin/Categorias'
import { AdminMesas } from '@/pages/admin/Mesas'
import { AdminUsuarios } from '@/pages/admin/Usuarios'
import { AdminPedidos } from '@/pages/admin/Pedidos'
import { AdminSubcategorias } from '@/pages/admin/Subcategorias'
import { AdminInformes } from '@/pages/admin/Informes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode
  roles?: string[]
}) {
  const { isAuthenticated, profile, loading } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return
    if (!('Notification' in window) || !('PushManager' in window)) return
    if (Notification.permission !== 'granted') return

    subscribePush().catch(() => {})

    // Re-subscribe when the user returns to the app (covers subscription changes while closed)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') subscribePush().catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(() => subscribePush().catch(() => {}), 30 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [isAuthenticated])

  if (loading) return <div className="min-h-screen bg-windsor" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.rol)) {
    if (profile.rol === 'admin') return <Navigate to="/admin" replace />
    if (profile.rol === 'cocina') return <Navigate to="/cocina" replace />
    if (profile.rol === 'recepcion') return <Navigate to="/recepcion" replace />
    return <Navigate to="/mozo" replace />
  }

  return <><PushBanner />{children}</>
}

function PushBanner() {
  const { state, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('push-banner-dismissed') === '1'
  )

  if (state !== 'default' || dismissed) return null

  const handleActivar = async () => {
    await subscribe()
    setDismissed(true)
    localStorage.setItem('push-banner-dismissed', '1')
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('push-banner-dismissed', '1')
  }

  return (
    <div className="bg-windsor-lighter border-b border-tierra/10 px-4 py-2.5">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        <p className="text-sm text-tierra">
          <Bell size={13} className="inline mr-1.5 text-jade" />
          Activá notificaciones para recibir alertas en tiempo real
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-tierra-muted hover:text-tierra transition-colors"
          >
            Ahora no
          </button>
          <button
            onClick={handleActivar}
            className="text-xs font-bold text-jade hover:text-jade-light transition-colors"
          >
            Activar
          </button>
        </div>
      </div>
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, profile, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-windsor" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (profile?.rol === 'admin') return <Navigate to="/admin" replace />
  if (profile?.rol === 'cocina') return <Navigate to="/cocina" replace />
  if (profile?.rol === 'recepcion') return <Navigate to="/recepcion" replace />
  return <Navigate to="/mozo" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Mozo */}
      <Route
        path="/mozo"
        element={
          <ProtectedRoute roles={['mozo', 'admin']}>
            <MozoLayout>
              <MesaSelector />
            </MozoLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mozo/mesa/:mesaId/nuevo-pedido"
        element={
          <ProtectedRoute roles={['mozo', 'admin']}>
            <MozoLayout>
              <NuevoPedido />
            </MozoLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mozo/mis-pedidos"
        element={
          <ProtectedRoute roles={['mozo', 'admin']}>
            <MozoLayout>
              <MisPedidos />
            </MozoLayout>
          </ProtectedRoute>
        }
      />

      {/* Cocina */}
      <Route
        path="/cocina"
        element={
          <ProtectedRoute roles={['cocina', 'admin']}>
            <KitchenDisplay />
          </ProtectedRoute>
        }
      />
      <Route
        path="/postres"
        element={
          <ProtectedRoute roles={['cocina', 'admin']}>
            <PostresDisplay />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pedidos"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminPedidos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/productos"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminProductos />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categorias"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminCategorias />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/mesas"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminMesas />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminUsuarios />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/subcategorias"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminSubcategorias />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/informes"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout>
              <AdminInformes />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Recepcion */}
      <Route
        path="/recepcion"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <MesasEnVivo />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/historial"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <Historial />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/dashboard"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <RecepcionDashboard />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/productos"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <RecepcionProductos />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/categorias"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <RecepcionCategorias />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/subcategorias"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <RecepcionSubcategorias />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recepcion/mesas"
        element={
          <ProtectedRoute roles={['recepcion', 'admin']}>
            <RecepcionLayout>
              <RecepcionMesas />
            </RecepcionLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <OfflineBanner />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
