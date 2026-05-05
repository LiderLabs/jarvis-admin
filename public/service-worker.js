const CACHE_NAME = 'washlab-admin-v1';
const urlsToCache = ['/', '/favicon.ico'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => { if (cacheName !== CACHE_NAME) return caches.delete(cacheName); }))));
});
