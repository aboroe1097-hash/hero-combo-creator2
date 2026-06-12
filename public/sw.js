// sw.js - Minimal service worker for offline caching
const CACHE = 'vts-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/css/app.css',
        '/css/mobile.css',
        '/js/app.js',
        '/js/app-loading.js',
        '/js/state.js',
        '/js/app-builder.js',
        '/js/app-generator.js',
        '/images/logo.png',
      ])
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
