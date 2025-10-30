/* ===========================================================
   📦 ARSLAN PRO KIWI — Service Worker (versión estable)
   Funciones:
   - Cachea todos los archivos clave (modo offline completo)
   - Actualiza automáticamente en cada nueva versión
   - Limpia caches antiguos
   =========================================================== */

const CACHE_NAME = "arslan-pro-v104-kiwi";
const FILES_TO_CACHE = [
  "./",                // página principal
  "./index.html",
  "./style.css",
  "./app.js",
  "./logo.png",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

// 🧩 Instalar Service Worker y cachear archivos base
self.addEventListener("install", event => {
  console.log("🟢 Service Worker instalado");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("📦 Cacheando archivos esenciales…");
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error("❌ Error al cachear archivos:", err))
  );
});

// 🧹 Activar y limpiar caches antiguos
self.addEventListener("activate", event => {
  console.log("🧹 Activando nuevo Service Worker, limpiando versiones viejas…");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Borrando caché antigua:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ⚡ Interceptar peticiones y servir desde caché o red
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => {
        // Si existe en caché, devuélvelo
        if (resp) return resp;

        // Si no, intenta obtenerlo de la red
        return fetch(event.request).then(fetchResp => {
          // Guarda en caché una copia (solo si es GET)
          if (event.request.method === "GET") {
            const clone = fetchResp.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return fetchResp;
        });
      })
      .catch(() => {
        // Fallback en caso de estar offline sin caché
        if (event.request.destination === "document") {
          return caches.match("./index.html");
        }
      })
  );
});

// 🔄 Forzar actualización manual (útil al depurar)
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
