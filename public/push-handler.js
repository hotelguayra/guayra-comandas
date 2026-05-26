self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  event.waitUntil((async () => {
    // Get the existing summary notification (if any) to accumulate items
    const existing = await self.registration.getNotifications({ tag: 'pedidos' })
    const prevItems = existing[0]?.data?.items ?? []

    const newItem = { title: data.title ?? 'Pedido listo', body: data.body ?? '', url: data.url ?? '/mozo/mis-pedidos' }
    const allItems = [...prevItems, newItem]

    const title = allItems.length === 1
      ? newItem.title
      : `${allItems.length} pedidos listos para retirar`

    const body = allItems.length === 1
      ? newItem.body
      : allItems.map(i => i.title).join('\n')

    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'pedidos',
      renotify: true,
      data: { url: '/mozo/mis-pedidos', items: allItems, singleUrl: newItem.url },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const items = event.notification.data?.items ?? []
  // If only one pedido, open that mesa directly; otherwise open mis-pedidos
  const url = items.length === 1
    ? (event.notification.data?.singleUrl ?? '/mozo/mis-pedidos')
    : '/mozo/mis-pedidos'

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
