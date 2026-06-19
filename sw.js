// sw.js - versioned runtime cache for the GitHub Pages app shell.
const CACHE_VERSION = 'vts-v20260620-3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/maintenance-config.js',
  '/js/app-generator.js',
  '/js/app-loading.js',
  '/js/ocr-dashboard.js',
  '/js/skin-combos-db.js',
  '/js/state.js',
  '/js/translations.js',
  '/tabs/admin.html',
  '/images/boot/blazing-wing-right.png',
  '/images/boot/dreamy-wing-left.png',
  '/images/logo.png',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const normalizedCacheKey = url.search ? url.pathname : request;
  const shouldNetworkFirst =
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/css/');

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' }))
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (shouldNetworkFirst) {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' }))
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(normalizedCacheKey, copy));
          }
          return response;
        })
        .catch(() => caches.match(normalizedCacheKey).then((cached) => cached || caches.match(request)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});
