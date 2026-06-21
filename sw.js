const CACHE_NAME = 'sufficiency-economy-attendance-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './logo.png',
  './banner.jpg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/tesseract.min.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.warn('PWA caching warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Let the browser handle dynamic Firebase/Google API requests and non-GET requests directly (not cached by SW)
  if (
    e.request.method !== 'GET' ||
    e.request.url.includes('.googleapis.com') ||
    e.request.url.includes('identitytoolkit') ||
    e.request.url.includes('securetoken') ||
    e.request.url.includes('/identity/')
  ) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached, but fetch update in background for next time (Stale-While-Revalidate)
        fetch(e.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
