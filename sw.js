const CACHE_VERSION = '4';
const CACHE_NAME = `fitness-tracker-v${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/base/reset.css',
  './styles/base/variables.css',
  './styles/main.css',
  './js/main.js',
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png',
  './icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Failed to cache', url, err)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('./index.html', networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Статика: stale-while-revalidate — ответ из кэша сразу, сеть обновляет кэш в фоне
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });

      if (cachedResponse) {
        void networkFetch.catch(() => {});
        return cachedResponse;
      }
      return networkFetch;
    })
  );
});
