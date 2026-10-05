/*
 * Service worker de NNGG Euskadi.
 * Estrategia prudente para una intranet privada:
 * - Nunca se cachean páginas HTML ni respuestas de datos (pueden contener información personal).
 * - Se cachean solo recursos estáticos versionados (_next/static, iconos, fuentes).
 * - Si no hay conexión al navegar, se muestra /offline.html.
 * - Preparado para notificaciones push (sin activar todavía).
 */
const VERSION = 'nngg-v1'
const STATIC_CACHE = `${VERSION}-static`
const PRECACHE = ['/offline.html', '/icons/icon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
  }
})

// Base para futuras notificaciones push (requiere claves VAPID y suscripción en servidor).
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'NNGG Euskadi', body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'NNGG Euskadi', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(self.clients.openWindow(target))
})
