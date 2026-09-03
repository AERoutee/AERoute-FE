const CACHE_NAME = 'aeroute-offline-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/offline.html')))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('aeroute-offline-') && key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode !== 'navigate') return
  event.respondWith(fetch(request).catch(() => caches.match('/offline.html').then((response) => response || Response.error())))
})
