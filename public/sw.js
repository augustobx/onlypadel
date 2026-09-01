const CACHE_NAME = 'onlypadel-static-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/globe_192.png', '/globe_512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Las agendas, sesiones y páginas del admin nunca se guardan: siempre deben
  // representar el estado actual del servidor.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Next genera assets con hash, por lo que cache-first es seguro únicamente
  // para esos archivos inmutables y los íconos locales.
  const isImmutableAsset = url.pathname.startsWith('/_next/static/') || PRECACHE.includes(url.pathname);
  if (!isImmutableAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }))
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'OnlyPadel', body: event.data.text(), url: '/admin/dashboard' };
  }

  event.waitUntil(self.registration.showNotification(data.title || 'OnlyPadel', {
    body: data.body || '',
    icon: '/globe_192.png',
    badge: '/globe_192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/admin/dashboard' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === targetUrl);
    return existing ? existing.focus() : self.clients.openWindow(targetUrl);
  }));
});
