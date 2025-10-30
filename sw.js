const CACHE_NAME = 'arslan-fruit-v104-cache-v3';
const CACHE_ASSETS = [
  '/fruit/',
  '/fruit/index.html',
  '/fruit/style.css',
  '/fruit/app.js',
  '/fruit/supabaseClient.js',
  // NO INCLUIMOS /favicon.ico porque no existe
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of CACHE_ASSETS) {
        try {
          await cache.add(asset);
          console.log('✅ Cacheado:', asset);
        } catch (err) {
          console.warn('⚠️ No se pudo cachear:', asset);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activado');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/fruit/index.html').then(resp => resp || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).then(fetchResp => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResp.clone());
          return fetchResp;
        });
      }).catch(() => new Response('⚠️ Sin conexión y sin caché', {status: 503}));
    })
  );
});
