import { useAuthStore } from '@/store/authStore'
import { logout } from '@/services/auth'

export function useAuth() {
  const { session, user, profile, loading } = useAuthStore()

  const signOut = async () => {
    await logout()
  }

  return {
    session,
    user,
    profile,
    loading,
    isAuthenticated: !!session,
    isAdmin: profile?.rol === 'admin',
    isCocina: profile?.rol === 'cocina',
    isMozo: profile?.rol === 'mozo',
    signOut,
  }
}
