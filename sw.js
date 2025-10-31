/* ============================================================
   🥝 ARSLAN PRO V10.4 KIWI — SERVICE WORKER (FULL FIX)
   ============================================================ */

const CACHE_NAME = "arslan-pro-v104-cache-v5";
const OFFLINE_URL = "/offline.html";

// Archivos que se precachean (ajusta según tu estructura)
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/logo.png",
  OFFLINE_URL
];

// ============================================================
// 📦 INSTALACIÓN — precache de los recursos estáticos
// ============================================================
self.addEventListener("install", event => {
  console.log("📦 Instalando Service Worker…");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// 🚀 ACTIVACIÓN — limpia versiones antiguas del caché
// ============================================================
self.addEventListener("activate", event => {
  console.log("🚀 Activando nuevo Service Worker…");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ============================================================
// 🌐 FETCH — modo offline seguro
// ============================================================
self.addEventListener("fetch", event => {
  const { request } = event;

  // ⚠️ No cachear peticiones POST, PUT, DELETE ni Supabase
  const url = request.url;
  if (
    request.method !== "GET" ||
    url.includes("supabase.co") ||
    url.includes("/rest/v1/")
  ) {
    return; // deja pasar al navegador
  }

  // 🎯 Estrategia: "Cache falling back to network"
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(request)
        .then(networkResponse => {
          // Guardar en caché solo respuestas válidas (200)
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// ============================================================
// 🔄 ACTUALIZACIÓN FORZADA DESDE LA APP
// ============================================================
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    console.log("♻️ Actualización de Service Worker forzada por la app.");
  }
});

// ============================================================
// ✅ LOG DE CONTROL
// ============================================================
console.log("✅ Service Worker registrado y en ejecución (ARSLAN PRO KIWI).");
