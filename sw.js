/* ==========================================================
   Service Worker — ARSLAN PRO V10.4 (KIWI Edition)
   Proyecto: fruit
   Funciones:
   - Cachea recursos principales para modo offline
   - Actualiza automáticamente al cambiar versión
   ========================================================== */

const CACHE_NAME = 'arslan-fruit-v104-cache-v1';
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

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(CACHE_ASSETS);
        console.log('✅ Archivos cacheados correctamente');
      } catch (err) {
        console.warn('⚠️ Error cacheando algunos archivos:', err);
      }
    })()
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log('🗑️ Borrando caché antigua:', k);
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/fruit/index.html');
        }
      }
    })()
  );
});

