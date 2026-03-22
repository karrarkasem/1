// Burjuman — Service Worker v1.0
// يعمل في الخلفية حتى لو المتصفح مغلق

const IMG_CACHE = 'bj-img-v1';
const IMG_MAX   = 200;

self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isImg = /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url)
    || url.includes('firebasestorage.googleapis.com')
    || url.includes('drive.google.com/uc');
  if (!isImg) return;

  event.respondWith(
    caches.open(IMG_CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
          cache.keys().then(keys => {
            if (keys.length > IMG_MAX) cache.delete(keys[0]);
          });
        }
        return response;
      } catch {
        return cached || new Response('', { status: 408 });
      }
    })
  );
});


importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMLyYD0U5v3B3CWv80i-1mUGpBpkNKB98",
  authDomain: "burjuman-6cb83.firebaseapp.com",
  projectId: "burjuman-6cb83",
  storageBucket: "burjuman-6cb83.firebasestorage.app",
  messagingSenderId: "177984721378",
  appId: "1:177984721378:web:afb0a673eb1a4f1c1b69bb"
});

const messaging = firebase.messaging();

// إشعار يصل حتى لو المتصفح مغلق
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'برجمان';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  || '/icon.png';
  const url   = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    dir: 'rtl',
    tag: payload.data?.tag || 'burjuman',
    data: { url }
  });
});

// عند الضغط على الإشعار يفتح الصفحة المناسبة
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.focus();
          c.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
