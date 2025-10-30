// sw.js — PWA FRUIT con soporte offline (versión final corregida)
const CACHE_NAME = 'fruit-cache-v3';
const FILES_TO_CACHE = [
  '/fruit/',
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js',
  '/fruit/favicon.ico',
  '/fruit/offline.html'
];

// 🟢 INSTALAR: precachear archivos existentes
self.addEventListener('install', event => {
  console.log('🍎 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        FILES_TO_CACHE.map(url => cache.add(url))
      );
      results.forEach(r => {
        if (r.status === 'rejected') {
          console.warn('⚠️ No se pudo cachear:', r.reason);
        }
      });
    })
  );
  self.skipWaiting();
});

// 🟠 ACTIVAR: eliminar cachés antiguos
self.addEventListener('activate', event => {
  console.log('🍊 Service Worker activado');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 🔵 INTERCEPTAR PETICIONES: modo offline
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // Navegación (HTML)
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/fruit/offline.html'))
    );
  } else {
    // Otros recursos (CSS, JS, imágenes, etc.)
    event.respondWith(
      caches.match(event.request).then(response => {
        return (
          response ||
          fetch(event.request).then(fetchResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          })
        );
      })
    );
  }
});
