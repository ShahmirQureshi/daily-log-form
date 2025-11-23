const CACHE_NAME = "logform-cache-v1";

const urlsToCache = [
  "/index.html",
  "/main.js",
  "/style.css",
  "/fault_mapping.json",
  "/mappings.json",
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png",
  "/icons/android-chrome-512x512-maskable.png",
  // add any other local files your app uses
];

// Install service worker and cache files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate service worker
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Fetch files from cache first, fallback to index.html if offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => caches.match("/index.html"));
    })
  );
});
