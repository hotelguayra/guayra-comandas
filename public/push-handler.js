self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Pedido listo', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.pedidoId ? `pedido-${data.pedidoId}` : `pedido-${Date.now()}`,
      renotify: true,
      data: { url: data.url ?? '/mozo/mis-pedidos' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/mozo/mis-pedidos'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((c) => c && c.navigate ? c.navigate(url) : null)
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Fired when the browser renews the push subscription (e.g. FCM token refresh after long inactivity).
// Without this handler the server keeps the stale endpoint and all subsequent pushes fail silently.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Only use browser-provided newSubscription.
        // Never call pushManager.subscribe() here: event.oldSubscription.options.applicationServerKey
        // is an ArrayBuffer (not Uint8Array), which creates a badly-bound subscription → FCM returns 410.
        // If newSubscription is null, do nothing — the app will re-subscribe via visibilitychange on next open.
        const newSub = event.newSubscription
        if (!newSub || !event.oldSubscription) return

        // Read Supabase config stored by the app when it last subscribed.
        // anonKey is required: Supabase Edge Functions reject requests without Authorization header (401).
        // userId is a fallback: if the old endpoint was deleted from DB (e.g. after a 410), the server
        // can still upsert the new subscription using the userId directly.
        const cache = await caches.open('sw-config-v1')
        const [urlRes, keyRes, userRes] = await Promise.all([
          cache.match('/supabase-url'),
          cache.match('/supabase-anon-key'),
          cache.match('/user-id'),
        ])
        if (!urlRes) return
        const supabaseUrl = (await urlRes.text()).replace(/\/$/, '')
        const anonKey = keyRes ? (await keyRes.text()).trim() : ''
        const userId = userRes ? (await userRes.text()).trim() : ''

        const headers = { 'Content-Type': 'application/json' }
        if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`

        await fetch(`${supabaseUrl}/functions/v1/update-push-sub`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription.endpoint,
            newSubscription: newSub.toJSON(),
            userId,
          }),
        })
      } catch (e) {
        console.error('[push-handler] pushsubscriptionchange error:', e)
      }
    })()
  )
})
