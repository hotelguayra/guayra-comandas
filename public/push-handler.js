self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Pedido listo', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Use pedido-specific tag so concurrent notifications don't replace each other
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
