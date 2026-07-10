/* Minimal PWA service worker: network-first navigations, cache-first static assets. */
const CACHE_NAME = "movai-static-v3";
const PRECACHE = ["/", "/manifest.webmanifest"];

function isCacheableAssetResponse(response) {
  if (!response.ok) return false;
  const type = response.headers.get("content-type") ?? "";
  if (urlLooksLikeScript(response.url) && !type.includes("javascript")) return false;
  if (response.url.includes("/_next/static/css/") && !type.includes("css")) return false;
  return true;
}

function urlLooksLikeScript(url) {
  return url.includes("/_next/static/chunks/") || url.endsWith(".js");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static Next assets: cache first, but never persist broken responses.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (isCacheableAssetResponse(response)) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
