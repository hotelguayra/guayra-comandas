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
    setState(Notification.permission as PushState)
  }, [])

  const subscribe = useCallback(async () => {
    const ok = await subscribePush()
    setState(ok ? 'granted' : (Notification.permission as PushState))
    return ok
  }, [])

  return { state, subscribe }
}
