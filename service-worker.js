const CACHE_NAME = "logform-cache-v1";
const urlsToCache = [
  "index.html",
  "style.css",
  "script.js",
  "mappings.json",
  "fault_types.json",
  "manifest.json"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.match(e.request).then(resp=>{
      return resp || fetch(e.request);
    })
  );
});
