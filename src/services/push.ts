import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr  // Uint8Array, not arr.buffer — Chrome Android requiere Uint8Array o la suscripcion queda mal vinculada al VAPID key y FCM devuelve 410
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  const regs = await navigator.serviceWorker.getRegistrations()
  return regs[0] ?? null
}

export async function subscribePush(): Promise<boolean> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  console.log('[push] vapidKey:', vapidKey ? 'ok' : 'MISSING')
  if (!vapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    console.log('[push] permission:', permission)
    if (permission !== 'granted') return false

    const registration = await getRegistration()
    console.log('[push] registration:', registration ? 'ok' : 'NONE')
    if (!registration) return false

    const { data: { user } } = await supabase.auth.getUser()
    console.log('[push] user:', user?.id ?? 'NONE')
    if (!user) return false

    // Check if the browser's existing subscription is already synced with the DB.
    // If the endpoints match, the subscription is valid — nothing to do.
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      const { data: dbSub } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', user.id)
        .single()
      const dbEndpoint = (dbSub?.subscription as any)?.endpoint
      if (dbEndpoint && dbEndpoint === existing.endpoint) {
        console.log('[push] subscription already synced, skipping')
        return true
      }
      // Endpoint mismatch or missing from DB (e.g. deleted after 410) — force fresh subscription
      console.log('[push] endpoint mismatch or missing in DB, re-subscribing')
      try { await existing.unsubscribe() } catch (_) { /* ignore — may already be expired */ }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
    console.log('[push] new subscription endpoint:', subscription.endpoint)

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_id: user.id, subscription: subscription.toJSON() }, { onConflict: 'user_id' })
    console.log('[push] upsert error:', error ?? 'none')

    if (!error) {
      // Store Supabase URL in SW cache so the pushsubscriptionchange handler can call the server
      // even when the app is closed (SW has no access to env variables or auth)
      try {
        const swCache = await caches.open('sw-config-v1')
        await swCache.put('/supabase-url', new Response(import.meta.env.VITE_SUPABASE_URL ?? ''))
      } catch {}
    }

    return !error
  } catch (e) {
    console.error('[push] error:', e)
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await getRegistration()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  } catch {
    // silently ignore
  }
}
