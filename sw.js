const CACHE_NAME = 'fitness-tracker-v1';

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

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Возвращаем из кэша, если есть, иначе идем в сеть
      return response || fetch(event.request).then((fetchRes) => {
        // Подкэшируем новые ресурсы на лету
        return caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.startsWith('http') && event.request.method === 'GET') {
            cache.put(event.request, fetchRes.clone());
          }
          return fetchRes;
        });
      });
    }).catch(() => {
      // Fallback (например, можно возвращать index.html для SPA)
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
