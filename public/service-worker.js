const CACHE_NAME = "user-sync-app-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/assets/css/style.css",
  "/assets/js/app.js",
  // Add your other assets
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
