const VERSION      = 'v9'
const SHELL_CACHE  = `milo-shell-${VERSION}`
const STATIC_CACHE = `milo-static-${VERSION}`
const ASSETS_CACHE = `milo-assets-${VERSION}`

// NOTE: '/' is intentionally NOT pre-cached. The root is a redirect (→ /auth or
// /parent); a service worker cannot return a cached redirected response to a
// navigation (the browser fails it with ERR_FAILED). The root is handled by a
// dedicated passthrough in the fetch handler below.
const APP_PAGES = ['/menu', '/game', '/parent', '/auth', '/profile', '/shop', '/offline.html', '/manifest.json']

// ─── Install — pre-cache all app pages ───────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => Promise.allSettled(APP_PAGES.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('milo-') && !k.endsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return
  if (url.hostname.includes('supabase.co')) return
  if (url.pathname.includes('hmr') || url.pathname.includes('webpack')) return

  // Root navigations redirect (→ /auth or /parent). A SW must NOT serve a
  // redirected response to a navigation, so pass the request straight through
  // and let the browser follow the redirect itself.
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(
      fetch(request, { redirect: 'manual' }).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        return (await cache.match('/auth')) ||
               (await caches.match('/offline.html')) ||
               new Response('Offline', { status: 503 })
      })
    )
    return
  }

  // Static chunks — cache first forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // RSC payloads — cache first, return empty if nothing cached offline
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        const cached = await cache.match(request)
        // Update cache in background
        fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()) }).catch(() => {})
        if (cached) return cached
        // Not cached yet — try network
        try {
          const r = await fetch(request)
          if (r.ok) cache.put(request, r.clone())
          return r
        } catch {
          // Return empty RSC response so page renders from client state
          return new Response('', { status: 200, headers: { 'content-type': 'text/x-component' } })
        }
      })
    )
    return
  }

  // Images and fonts — cache first
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE))
    return
  }

  // App pages — stale while revalidate
  // Serve from cache IMMEDIATELY, update in background
  event.respondWith(
    caches.open(SHELL_CACHE).then(async cache => {
      const cached = await cache.match(request)

      // Always try to update cache in background.
      // Never cache redirected/non-ok responses — a redirected response cannot
      // be replayed to a navigation (causes ERR_FAILED).
      const networkPromise = fetch(request)
        .then(r => { if (r.ok && !r.redirected) cache.put(request, r.clone()); return r })
        .catch(() => null)

      // Cached and safe to replay? Return immediately (stale while revalidate)
      if (cached && !cached.redirected) {
        networkPromise.catch(() => {})
        return cached
      }

      // Not cached — wait for network
      const response = await networkPromise
      if (response) return response

      // Offline fallback
      if (request.mode === 'navigate') {
        return caches.match('/offline.html').then(r => r || new Response('Offline', { status: 503 }))
      }
      return new Response('Offline', { status: 503 })
    })
  )
})

async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const r = await fetch(request)
    if (r.ok) cache.put(request, r.clone())
    return r
  } catch {
    return new Response('', { status: 503 })
  }
}

self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_ONLINE') {
    fetch('/manifest.json', { cache: 'no-store' })
      .then(() => self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'ONLINE' }))))
      .catch(() => self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'OFFLINE' }))))
  }
})