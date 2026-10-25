// website/public/sw.js
const CACHE_NAME = "schoolpay-v1";

// 1. Install: Activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 2. Activate: Take control of all pages
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 3. Fetch: The critical part for Next.js App Router
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  //  CRITICAL: Do NOT intercept Next.js internal RSC/Flight requests or API routes
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/api/")) {
    return; // Let the browser handle these normally
  }

  // For navigation requests (loading a page), use a Network-First strategy
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, try to serve the cached page
        return caches.match(event.request);
      }),
    );
    return;
  }

  // For other requests, let them pass through to the network
  return;
});
