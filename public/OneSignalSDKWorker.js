// OneSignal Service Worker - Self-Hosted Version
// This file handles push notifications from OneSignal

// OneSignal Service Worker initialization
self.addEventListener('push', function(event) {
  console.log('[OneSignal] Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('[OneSignal] Push data:', data);
    
    const options = {
      body: data.alert || data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      image: data.image,
      tag: data.tag || 'onesignal-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Sapori & Colori', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('[OneSignal] Notification click received:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const clickUrl = notificationData.url || '/portal';
  
  event.waitUntil(
    clients.openWindow(clickUrl)
  );
});

// Service Worker activation
self.addEventListener('activate', function(event) {
  console.log('[OneSignal] Service Worker activated');
});

// Service Worker installation
self.addEventListener('install', function(event) {
  console.log('[OneSignal] Service Worker installed');
  self.skipWaiting();
});