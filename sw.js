self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of CACHE_ASSETS) {
        try {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response.clone());
            console.log('✅ Cacheado:', asset);
          } else {
            console.warn('⚠️ No se pudo cachear (respuesta no OK):', asset);
          }
        } catch (err) {
          console.warn('⚠️ Error al cachear:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

