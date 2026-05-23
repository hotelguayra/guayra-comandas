import { type ReactNode, useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, Table2, Users, ClipboardList,
  Menu, X, Layers, BarChart2, ChefHat, UtensilsCrossed, Building2, ChevronDown
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/ui/Logo'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { UserProfileModal } from '@/components/ui/UserProfileModal'
import { supabase } from '@/lib/supabase'
import { clsx } from 'clsx'

const VIEW_ITEMS = [
  { to: '/cocina', icon: ChefHat, label: 'Ver como Cocina' },
  { to: '/mozo', icon: UtensilsCrossed, label: 'Ver como Mozo' },
  { to: '/recepcion', icon: Building2, label: 'Ver como Recepción' },
]

function LogoDropdown() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 group w-full"
      >
        <img src="/logoG.png" alt="Guayrá" className="h-8 w-auto object-contain" />
        <div className="flex-1 text-left">
          <h1 className="font-heading leading-none text-lg text-tierra-light">Guayrá</h1>
          <p className="text-xs tracking-widest uppercase text-tierra-muted">Comandas</p>
        </div>
        <ChevronDown size={14} className={clsx('text-tierra-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-windsor-card border border-tierra/15 rounded-xl shadow-lg overflow-hidden z-50">
          {VIEW_ITEMS.map(({ to, icon: Icon, label }) => (
            <button
              key={to}
              onClick={() => { navigate(to); setOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-tierra-muted hover:text-tierra hover:bg-windsor-lighter transition-colors"
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { to: '/admin/productos', icon: Package, label: 'Productos' },
  { to: '/admin/categorias', icon: Tag, label: 'Categorías' },
  { to: '/admin/subcategorias', icon: Layers, label: 'Subcategorías' },
  { to: '/admin/mesas', icon: Table2, label: 'Mesas' },
  { to: '/admin/informes', icon: BarChart2, label: 'Informes' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
]

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [changePassOpen, setChangePassOpen] = useState(false)

  const { data: eliminadosHoy = 0 } = useQuery({
    queryKey: ['items-eliminados-hoy'],
    queryFn: async () => {
      const seenAt = localStorage.getItem('informes-eliminados-seen-at')
        ?? new Date().toISOString().slice(0, 10) + 'T00:00:00'
      const { count, error } = await supabase
        .from('items_eliminados')
        .select('*', { count: 'exact', head: true })
        .gt('eliminado_at', seenAt)
      return error ? 0 : (count ?? 0)
    },
    staleTime: 30000,
    refetchInterval: 60000,
  })

  return (
    <div className="min-h-screen bg-windsor flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-windsor-card border-r border-tierra/10 min-h-screen fixed top-0 left-0 z-30">
        <div className="p-6 border-b border-tierra/10">
          <LogoDropdown />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors',
                  isActive
                    ? 'bg-bronceado/10 text-bronceado border border-bronceado/20'
                    : 'text-tierra-muted hover:text-tierra hover:bg-windsor-lighter'
                )
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {to === '/admin/informes' && eliminadosHoy > 0 && (
                <span className="w-5 h-5 rounded-full bg-rubi text-white text-[10px] flex items-center justify-center font-bold leading-none">
                  {eliminadosHoy > 9 ? '9+' : eliminadosHoy}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-tierra/10">
          <button
            onClick={() => setChangePassOpen(true)}
            className="flex items-center gap-3 w-full mb-3 px-2 rounded-xl hover:bg-windsor-lighter transition-colors py-2"
          >
            <div className="w-8 h-8 rounded-full bg-bronceado/20 flex items-center justify-center text-bronceado font-bold text-sm">
              {profile?.nombre?.[0]?.toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm text-tierra font-bold truncate">{profile?.nombre}</p>
              <p className="text-xs text-tierra-muted capitalize">{profile?.rol}</p>
            </div>
          </button>
        </div>
        <UserProfileModal open={changePassOpen} onClose={() => setChangePassOpen(false)} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-windsor-card border-r border-tierra/10 flex flex-col">
            <div className="p-6 border-b border-tierra/10 flex items-center justify-between">
              <LogoDropdown />
              <button onClick={() => setSidebarOpen(false)} className="text-tierra-muted ml-2">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors',
                      isActive
                        ? 'bg-bronceado/10 text-bronceado border border-bronceado/20'
                        : 'text-tierra-muted hover:text-tierra hover:bg-windsor-lighter'
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-tierra/10">
              <LogoutButton className="w-full px-4 py-2.5 rounded-xl text-sm text-tierra-muted hover:text-rubi-light hover:bg-rubi/10 transition-colors" />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="glass border-b border-tierra/10 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-windsor-lighter text-tierra-muted transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="text-tierra-muted text-sm lg:hidden">
              {profile?.nombre}
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
