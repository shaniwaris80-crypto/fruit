/* ============================================================
   🥝 ARSLAN PRO V10.4 KIWI — Service Worker (FULL FIX)
   - Cache inteligente (solo GET)
   - Offline first para HTML, CSS, JS, imágenes
   - Evita errores POST en cache
   - Compatible con Supabase y PWA
   ============================================================ */

const CACHE_NAME = 'arslan-pro-v104-cache-v3';
const OFFLINE_URL = '/offline.html';

// Archivos base que se precachean
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/logo.png',
  '/manifest.json',
  '/offline.html',
];

// ============================================================
// INSTALACIÓN DEL SERVICE WORKER
// ============================================================
self.addEventListener('install', event => {
  console.log('📦 Instalando Service Worker KIWI...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVACIÓN DEL SERVICE WORKER
// ============================================================
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activado:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antigua:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ============================================================
// INTERCEPTOR DE PETICIONES
// ============================================================
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Evita cachear llamadas de Supabase o POST/PUT/DELETE
  if (
    req.method !== 'GET' ||
    url.origin.includes('supabase.co') ||
    url.origin.includes('supabase.in')
  ) {
    return; // deja que pase directo sin cache
  }

  // Modo offline: intenta cache, luego red
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(req)
        .then(networkResponse => {
          // Cachear solo respuestas GET válidas
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, cloned));
          }
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// ============================================================
// MANEJO DE MENSAJES DESDE LA APP
// ============================================================
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then(keys => {
      keys.forEach(key => {
        if (key.startsWith('arslan-pro')) {
          caches.delete(key);
        }
      });
    });
  }
});

// ============================================================
// FIN DEL SERVICE WORKER 🥝
// ============================================================
