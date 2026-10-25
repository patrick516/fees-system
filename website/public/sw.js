const CACHE_NAME = "schoolpay-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/api/")) {
    return; // Let the browser handle these normally.
  }

  // For navigation requests (loading a page), use a Network-First strategy.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails, try to serve a cached page as a fallback.
        return caches.match(event.request);
      }),
    );
    return;
  }
  return;
});
