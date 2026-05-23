import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export async function subscribePush(): Promise<boolean> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: user.id, subscription: subscription.toJSON() }, { onConflict: 'user_id' })

    return true
  } catch {
    return false
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  } catch {
    // silently ignore
  }
}
