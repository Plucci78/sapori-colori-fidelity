const CACHE_NAME = 'sapori-colori-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png'
];

// Rileva se siamo in development
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

self.addEventListener('install', function(event) {
  // Skip waiting per aggiornamenti immediati
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function(event) {
  // Pulisci cache vecchie
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendi controllo immediato
  return self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // DISABILITA CACHE IN DEVELOPMENT
  if (isDevelopment) {
    return; // Passa tutto al network
  }
  
  // Solo per richieste GET e non per API calls
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('/_vite/') ||
      event.request.url.includes('.hot-update.')) {
    return;
  }
  
  // Strategy: Cache First per assets statici, Network First per tutto il resto
  const url = new URL(event.request.url);
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
  
  if (isStaticAsset) {
    // Cache First per assets
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(function(response) {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(function(cache) {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  } else {
    // Network First per HTML e altro
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
  }
});

self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'Nuova notifica da Sapori & Colori!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Apri App',
        icon: '/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Chiudi',
        icon: '/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Sapori & Colori', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});