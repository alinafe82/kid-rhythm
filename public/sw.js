const CACHE_NAME = 'kidrhythm-shell-v2'
const APP_SHELL = ['/index.html', '/favicon.svg', '/manifest.webmanifest']
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('kidrhythm-shell-') && key !== CACHE_NAME)
    .map((key) => caches.delete(key)))))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const planner = request.mode === 'navigate' && (url.pathname === '/app' || url.pathname.startsWith('/app/'))
  const asset = url.pathname.startsWith('/assets/') || APP_SHELL.includes(url.pathname)
  if (!planner && !asset) return
  event.respondWith(fetch(request).then(async (response) => {
    if (response.ok && asset && !url.search) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  }).catch(async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(planner ? '/index.html' : request)
    return cached || new Response('Reconnect to load this page.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }))
})
