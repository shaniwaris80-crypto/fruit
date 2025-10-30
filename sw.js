// sw.js — PWA FRUIT con soporte offline
const CACHE_NAME = 'fruit-cache-v2';
const FILES_TO_CACHE = [
  '/fruit/',
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js',
  '/fruit/logo.png',
  '/fruit/manifest.json',
  '/fruit/offline.html'
];

// 🟢 Instalar: precachear archivos
self.addEventListener('install', event => {
  console.log('🍎 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 🟠 Activar: limpiar viejos cachés
self.addEventListener('activate', event => {
  console.log('🍊 Service Worker activado');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 🔵 Interceptar peticiones
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // Peticiones de navegación (HTML)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Si no hay conexión, mostrar la página offline
          return caches.match('/fruit/offline.html');
        })
    );
  } else {
    // Otros recursos (CSS, JS, imágenes)
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
