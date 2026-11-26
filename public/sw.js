// Pulse360 service worker: makes the app installable and lets it open with
// no connection. It caches the app itself (HTML shell, scripts, styles,
// icons), never data: Supabase and /api requests always go to the network,
// so nothing from one person's session is left on a shared device.
//
// The page registers /sw.js?v=<build id>, so every deploy installs a fresh
// worker with its own cache, and old caches are deleted on activation.

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `pulse360-shell-${VERSION}`;
const SHELL = ['/app.html', '/manifest.webmanifest', '/icons/app-192.png', '/icons/app-512.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pulse360-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Other origins (Supabase, fonts), our API and analytics: straight to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/ingest/')) return;

  // Page loads: try the network so a deploy shows up at once; offline, serve the
  // app shell. "/" is the public landing page, so it is never stored as the shell.
  if (request.mode === 'navigate') {
    const isApp = !['/', '/index.html', '/privacy', '/privacy.html', '/terms', '/terms.html'].includes(url.pathname);
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isApp) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/app.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/app.html')),
    );
    return;
  }

  // Built assets have content hashes in their names, so a cached copy is never stale.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
