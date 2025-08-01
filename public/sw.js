const CACHE_NAME = 'sapori-colori-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // Solo per richieste GET e non per API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Se la richiesta ha successo, salva in cache
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
        // Solo se fallisce, usa la cache
        return caches.match(event.request);
      })
  );
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