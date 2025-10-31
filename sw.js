// 📦 Nombre del caché (personaliza si cambias versión del proyecto)
const CACHE_NAME = 'arslan-pro-v104-cache';

// 🗃️ Lista de archivos a cachear para modo offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './logo.png',
  './offline.html'
];

// 🛠️ Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('📦 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📁 Cacheando archivos del proyecto...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 🔁 Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
  console.log('♻️ Activando nuevo Service Worker...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 🌐 Intercepción de red: servir caché si no hay conexión
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // Solo GET se cachea

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 📦 Sirve desde caché si existe
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🌍 Si no está en caché, intenta la red
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          // 📄 Si es fallo en navegación, usar offline.html
          return caches.match('./offline.html');
        }
      });
    })
  );
});
