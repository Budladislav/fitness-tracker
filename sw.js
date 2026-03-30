const CACHE_NAME = 'fitness-tracker-v2.5.0';

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
      // Кэшируем основные ресурсы, но не падаем, если что-то не найдено (используем map и catch)
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
  // Для Firebase и внешних API используем сеть
  if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  // Для переходов по страницам всегда пробуем сеть первой, чтобы быстрее получать новую версию.
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

  // Для остальных статических ресурсов: cache-first + фоновое обновление.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((networkResponse) => {
        if (event.request.url.startsWith('http') && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      });

      return cachedResponse || networkFetch;
    })
  );
});
