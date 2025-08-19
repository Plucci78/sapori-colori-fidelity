const CACHE_NAME = 'sapori-colori-v4';
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
  
  // DISABILITA COMPLETAMENTE CACHE PER TUTTE LE API CALLS
  if (event.request.url.includes('/api/')) {
    console.log('🚫 SW: Ignoring API call:', event.request.url);
    return; // Non intercettare mai le API calls
  }
  
  // DISABILITA CACHE PER RICHIESTE NON-GET (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    console.log('🚫 SW: Ignoring non-GET request:', event.request.method, event.request.url);
    return;
  }
  
  // DISABILITA CACHE PER VITE DEV FILES
  if (event.request.url.includes('/_vite/') ||
      event.request.url.includes('.hot-update.') ||
      event.request.url.includes('/@vite/') ||
      event.request.url.includes('/@id/')) {
    return;
  }
  
  // SOLO per assets statici veramente statici
  const url = new URL(event.request.url);
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/.test(url.pathname);
  
  // SOLO cache per assets che sappiamo essere statici
  if (isStaticAsset && !url.pathname.includes('index') && !url.pathname.includes('main')) {
    console.log('📦 SW: Caching static asset:', url.pathname);
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            console.log('💾 SW: Serving from cache:', url.pathname);
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
    // PER TUTTO IL RESTO: SEMPRE NETWORK FIRST, NO CACHE
    console.log('🌐 SW: Network first for:', url.pathname);
    event.respondWith(
      fetch(event.request)
        .catch(function() {
          // Solo se il network fallisce completamente, prova cache
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