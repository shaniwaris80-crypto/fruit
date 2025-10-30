// sw.js — Service Worker para PWA FRUIT
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open('fruit-cache-v1').then(cache => {
      return cache.addAll([
        '/fruit/',
        '/fruit/index.html',
        '/fruit/style.css',
        '/fruit/app.js',
        '/fruit/logo.png',
        '/fruit/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', () => {
  console.log('Service Worker activado');
});
