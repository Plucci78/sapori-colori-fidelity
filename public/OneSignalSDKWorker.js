// OneSignal Service Worker
// Questo file gestisce le notifiche push di OneSignal

importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Integrazione con il service worker esistente
const CACHE_NAME = 'sapori-colore-v2-onesignal';
const urlsToCache = [
  '/',
  '/portal',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://saporiecolori.net/wp-content/uploads/2024/07/saporiecolorilogo2.png'
];

// Install event - cache risorse
self.addEventListener('install', function(event) {
  console.log('🔧 OneSignal SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - strategia network-first
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

// Gestione click notifiche personalizzate
self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notifica cliccata:', event);
  
  event.notification.close();

  // Apri/focus finestra app
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Se c'è già una finestra aperta, focusla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/portal') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Altrimenti apri nuova finestra
      if (clients.openWindow) {
        return clients.openWindow('/portal');
      }
    })
  );
});