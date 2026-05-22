import { createContext, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Restaurar sesión existente al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        // Construir profile desde JWT metadata (sin tocar la tabla profiles)
        const meta = session.user.user_metadata ?? {}
        setProfile({
          id: session.user.id,
          nombre: meta.nombre ?? session.user.email?.split('@')[0] ?? '',
          rol: meta.rol ?? 'mozo',
          activo: true,
          created_at: session.user.created_at,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        reset()
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
        const meta = session.user.user_metadata ?? {}
        setProfile({
          id: session.user.id,
          nombre: meta.nombre ?? session.user.email?.split('@')[0] ?? '',
          rol: meta.rol ?? 'mozo',
          activo: true,
          created_at: session.user.created_at,
        })
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}
