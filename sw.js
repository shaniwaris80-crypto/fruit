// ============================
// ARSLAN PRO V10.4 - SW KIWI
// Service Worker para /fruit/
// ============================

const CACHE_NAME = 'arslan-fruit-v104-cache-v2';

// Archivos a cachear (asegúrate de que existan todos)
const CACHE_ASSETS = [
  '/fruit/',
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js',
  '/fruit/supabaseClient.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'
];

// Instalación: cachear recursos
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of CACHE_ASSETS) {
        try {
          await cache.add(asset);
          console.log('✅ Cacheado:', asset);
        } catch (err) {
          console.warn('⚠️ No se pudo cachear:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activación: limpiar cachés viejas
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('🗑️ Borrando caché vieja:', k);
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: servir desde caché o red
self.addEventListener('fetch', event => {
  // Si la solicitud es para /fruit o /fruit/index.html → devuelve el index.html cacheado
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/fruit/index.html').then(resp => resp || fetch(event.request))
    );
    return;
  }

  // Para otros archivos (CSS, JS, etc.)
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).then(fetchResp => {
        // Cachear en segundo plano las nuevas respuestas
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResp.clone());
          return fetchResp;
        });
      }).catch(() => {
        // Si falla (sin conexión y sin caché)
        return new Response('⚠️ Sin conexión y recurso no cacheado.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
