// Burjuman — Service Worker v2.0
// يعمل في الخلفية حتى لو المتصفح مغلق + دعم كامل للعمل أوفلاين

const STATIC_CACHE = 'bj-static-v3';
const IMG_CACHE    = 'bj-img-v2';
const IMG_MAX      = 200;

const STATIC_ASSETS = [
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/theme.js',
  '/js/app.js',
  '/js/ads.js',
  '/js/push.js',
  '/js/preparer.js',
  '/js/driver.js',
  '/manifest.json',
];

// ── تثبيت: كاش الملفات الثابتة ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
});

// ── تفعيل: حذف الكاش القديم ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== STATIC_CACHE && k !== IMG_CACHE && k !== 'pending-orders')
          .map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// ── صف الطلبات أوفلاين ──
const DB_NAME = 'bj-pending-orders';
async function queueOrder(payload) {
  const cache = await caches.open('pending-orders');
  const key = '/pending-order-' + Date.now();
  await cache.put(key, new Response(JSON.stringify(payload)));
}
async function flushQueuedOrders() {
  const cache = await caches.open('pending-orders');
  const keys  = await cache.keys();
  for (const req of keys) {
    const resp = await cache.match(req);
    const data = await resp.json().catch(() => null);
    if (data) {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'FLUSH_ORDER', data }));
    }
    await cache.delete(req);
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(flushQueuedOrders());
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'QUEUE_ORDER') {
    queueOrder(event.data.payload);
  }
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;
  if (event.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com') || url.includes('identitytoolkit')) return;

  const isImg = /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url)
    || url.includes('firebasestorage.googleapis.com')
    || url.includes('drive.google.com/uc')
    || url.includes('i.ibb.co');

  const isStatic = url.includes('/css/') || url.includes('/js/') || url.includes('/lib/') || url.endsWith('.html') || url.endsWith('manifest.json');
  if (isStatic && !isImg) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          if (resp && resp.status === 200) {
            const cloned = resp.clone();
            caches.open(STATIC_CACHE).then(c => c.put(event.request, cloned));
          }
          return resp;
        }).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

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
  apiKey:            "%%FIREBASE_API_KEY%%",
  authDomain:        "%%FIREBASE_AUTH_DOMAIN%%",
  projectId:         "%%FIREBASE_PROJECT_ID%%",
  storageBucket:     "%%FIREBASE_STORAGE_BUCKET%%",
  messagingSenderId: "%%FIREBASE_MESSAGING_SENDER_ID%%",
  appId:             "%%FIREBASE_APP_ID%%"
});

const messaging = firebase.messaging();

// إشعار يصل حتى لو المتصفح مغلق
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'برجمان';
  const body  = payload.notification?.body  || '';
  const icon  = payload.notification?.icon  || '/icon.png';
  self.registration.showNotification(title, { body, icon, badge: '/icon.png' });
});
