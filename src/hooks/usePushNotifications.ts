import { useState, useEffect, useCallback } from 'react'
import { subscribePush } from '@/services/push'

type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('unsupported')

  useEffect(() => {
    if (
      !import.meta.env.VITE_VAPID_PUBLIC_KEY ||
      !('Notification' in window) ||
      !('PushManager' in window)
    ) {
      setState('unsupported')
      return
    }
    const perm = Notification.permission as PushState
    setState(perm)
    // Si ya tiene permiso pero no guardó la suscripción, la guarda ahora
    if (perm === 'granted' && !localStorage.getItem('push-subscribed')) {
      subscribePush().then((ok) => {
        if (ok) localStorage.setItem('push-subscribed', '1')
      }).catch(() => {})
    }
  }, [])

  const subscribe = useCallback(async () => {
    const ok = await subscribePush()
    setState(ok ? 'granted' : (Notification.permission as PushState))
    return ok
  }, [])

  return { state, subscribe }
}
