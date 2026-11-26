const CACHE_NAME = 'visionvoice-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];
const FONT_CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com'
];

// Install: Cache offline application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets & allowlisted font CDNs, Network Only for AI endpoints
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Never intercept AI API requests (always direct HTTPS)
  if (
    url.hostname.includes('openrouter.ai') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('api.groq.com') ||
    url.hostname.includes('rapidrouter.ai')
  ) {
    return;
  }

  // Navigation requests: Network First, fallback to cached index.html / root
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
          .then((res) => res || caches.match('/'))
          .then((res) => res || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
      )
    );
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isAllowlistedCdn = FONT_CDN_HOSTS.some((host) => url.hostname === host);
  if (!isSameOrigin && !isAllowlistedCdn) {
    return;
  }

  // Stale-While-Revalidate for static assets and allowlisted font/icon CDNs
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() =>
            cachedResponse || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          );

        if (cachedResponse) {
          event.waitUntil(networkFetch);
          return cachedResponse;
        }
        return networkFetch;
      });
    })
  );
});
