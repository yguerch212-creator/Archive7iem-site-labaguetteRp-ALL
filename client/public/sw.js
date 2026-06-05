// Service Worker — Archives 7e Armeekorps PWA
const CACHE_NAME = 'archives7e-v18';
const STATIC_ASSETS = ['/'];

// Install: cache shell, skip waiting immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean ALL old caches, claim clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - API/uploads: passthrough (no cache)
// - Navigation (HTML): network-first, cache fallback
// - Hashed assets (.js/.css with hash in filename): network-first, cache for offline
// - Other static: network-first
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache API calls or uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // Navigation: network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
    );
    return;
  }

  // All other assets: network-first (so deploys are always picked up)
  if (url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|jpeg)$/)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
});
