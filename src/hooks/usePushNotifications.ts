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
    // Re-subscribe on every mount when permission is granted.
    // subscribePush() returns early if the subscription is already synced with the DB,
    // so this is cheap in the normal case and handles expired subscriptions (410).
    if (perm === 'granted') {
      subscribePush().catch(() => {})
    }
  }, [])

  const subscribe = useCallback(async () => {
    const ok = await subscribePush()
    setState(ok ? 'granted' : (Notification.permission as PushState))
    return ok
  }, [])

  return { state, subscribe }
}
