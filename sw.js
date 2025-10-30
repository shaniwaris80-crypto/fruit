const CACHE_NAME = 'fruit-cache-v1';
const urlsToCache = [
  '/fruit/',
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js'
];

self.addEventListener('install', event => {
  console.log('🍎 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('🍏 Archivos agregados al caché');
      return cache.addAll(urlsToCache);
    }).catch(err => console.error('Error al cachear:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('🍊 Service Worker: Activado');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Devuelve el recurso del caché o lo descarga si no está guardado
      return response || fetch(event.request);
    })
  );
});
