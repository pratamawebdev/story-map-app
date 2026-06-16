const SHELL_CACHE = 'story-map-shell-v4';
const RUNTIME_CACHE = 'story-map-runtime-v4';
const API_CACHE = 'story-map-api-v4';
let lastCreatedStoryUrl = './#/';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './images/logo.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/maskable-icon-192x192.png',
  './icons/maskable-icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE, API_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  return networkResponse || cache.match('./index.html');
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'LAST_CREATED_STORY') return;

  lastCreatedStoryUrl = event.data.url || './#/';
  caches.open(RUNTIME_CACHE).then((cache) => {
    cache.put('./last-created-story-url', new Response(lastCreatedStoryUrl));
  });
});

async function getLastCreatedStoryUrl() {
  if (lastCreatedStoryUrl && lastCreatedStoryUrl !== './#/') {
    return lastCreatedStoryUrl;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  const response = await cache.match('./last-created-story-url');
  return response ? response.text() : './#/';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  if (requestUrl.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (
    requestUrl.origin.includes('unpkg.com') ||
    requestUrl.origin.includes('tile.openstreetmap.org') ||
    requestUrl.origin.includes('basemaps.cartocdn.com') ||
    requestUrl.origin.includes('server.arcgisonline.com') ||
    requestUrl.origin.includes('fonts.googleapis.com') ||
    requestUrl.origin.includes('fonts.gstatic.com')
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match('./index.html')),
    );
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};

      try {
        payload = event.data ? event.data.json() : {};
      } catch (error) {
        payload = {
          title: 'Story baru diterima',
          options: {
            body: event.data?.text() || 'Ada story baru dari Dicoding Story API.',
          },
        };
      }

      const title = payload.title || 'Story berhasil dibuat';
      const options = payload.options || {};
      const data = options.data || payload.data || {};
      const storyId = data.storyId || payload.storyId || null;
      const fallbackUrl = await getLastCreatedStoryUrl();
      const targetUrl = data.url || (storyId ? `./#/stories/${storyId}` : fallbackUrl);

      const notificationOptions = {
        body:
          options.body ||
          payload.body ||
          'Ada story baru dari Dicoding Story API. Ketuk untuk membuka detail story.',
        icon: options.icon || './icons/icon-192x192.png',
        badge: options.badge || './icons/icon-72x72.png',
        image: options.image,
        tag: options.tag || 'story-map-notification',
        renotify: true,
        data: {
          url: targetUrl,
          storyId,
          createdAt: Date.now(),
        },
        actions: [
          { action: 'open-story', title: 'Lihat detail' },
          { action: 'close', title: 'Tutup' },
        ],
      };

      await self.registration.showNotification(title, notificationOptions);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = new URL(event.notification.data?.url || './#/', self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const focusedClient = clientList.find((client) => 'focus' in client);

      if (focusedClient) {
        focusedClient.navigate(targetUrl);
        return focusedClient.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return null;
    }),
  );
});
