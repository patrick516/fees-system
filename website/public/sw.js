self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // Minimal fetch handler required by browsers to enable PWA installation
});
