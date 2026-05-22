import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/useAuth'

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

  if (loading) return <div className="min-h-screen bg-windsor" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.rol)) {
    if (profile.rol === 'admin') return <Navigate to="/admin" replace />
    if (profile.rol === 'cocina') return <Navigate to="/cocina" replace />
    if (profile.rol === 'recepcion') return <Navigate to="/recepcion" replace />
    return <Navigate to="/mozo" replace />
  }

  return <>{children}</>
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
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
