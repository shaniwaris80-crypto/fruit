// 🟢 INSTALACIÓN
// sw.js — PWA FRUIT
const CACHE_NAME = 'fruit-cache-v5';  // ✅ Definido antes de usarse
const FILES_TO_CACHE = [
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js',
  '/fruit/favicon.ico',
  '/fruit/offline.html'
];

self.addEventListener('install', event => {
  console.log('🍎 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of FILES_TO_CACHE) {
        try {
          await cache.add(url);
          console.log('✅ Cacheado:', url);
        } catch (err) {
          console.warn('⚠️ No se pudo cachear:', url, err);
        }
      }
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
