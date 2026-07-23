/* Move Quest service worker — shows push notifications even when no tab is open. */

function appBase() {
  try {
    const scope = self.registration && self.registration.scope
    if (scope) {
      const u = new URL(scope)
      return u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`
    }
  } catch {
    // fall through
  }
  return '/'
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = data.title || 'Move Quest'
  const body = data.body || 'Something new on the feed'
  const base = appBase()
  const icon = `${base}favicon.svg`
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: 'move-quest-feed',
      data: { url: data.url || base },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || appBase()
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          client.focus()
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url)
    })(),
  )
})
