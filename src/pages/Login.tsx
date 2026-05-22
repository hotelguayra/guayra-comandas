import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Logo } from '@/components/ui/Logo'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/Badge'
import type { UserRole } from '@/types'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setSession, setProfile, loading: authLoading, profile, reset } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    reset()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Si hay sesión activa la cerramos primero para poder cambiar de usuario
      await supabase.auth.signOut()

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      const meta = data.user.user_metadata ?? {}
      const rol = (meta.rol ?? 'mozo') as UserRole
      const nombre = meta.nombre ?? email.split('@')[0]

      setSession(data.session)
      setProfile({ id: data.user.id, nombre, rol, activo: true, created_at: data.user.created_at })

      const dest = rol === 'admin' ? '/admin' : rol === 'cocina' ? '/cocina' : '/mozo'
      navigate(dest, { replace: true })
    } catch {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-windsor flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        {/* Si ya hay sesión activa, mostrar quién es y opciones */}
        {!authLoading && profile && (
          <div className="card p-5 mb-4 flex items-center justify-between">
            <div>
              <p className="text-tierra text-sm font-bold">{profile.nombre}</p>
              <RoleBadge rol={profile.rol} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const dest = profile.rol === 'admin' ? '/admin' : profile.rol === 'cocina' ? '/cocina' : '/mozo'
                  navigate(dest)
                }}
              >
                Volver
              </Button>
              <Button size="sm" variant="secondary" onClick={handleLogout}>
                Salir
              </Button>
            </div>
          </div>
        )}

        <div className="card p-8">
          <h2 className="font-heading text-xl text-tierra-light mb-1">
            {profile ? 'Cambiar usuario' : 'Bienvenido'}
          </h2>
          <p className="text-tierra-muted text-sm mb-8">
            {profile ? 'Ingresá con otra cuenta' : 'Ingresá tus credenciales para continuar'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-rubi-light text-sm bg-rubi/10 border border-rubi/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-tierra-muted text-xs mt-6">
          Sistema de comandas Guayrá &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
