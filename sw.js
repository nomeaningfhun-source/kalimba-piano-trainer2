// Offline cache: app shell is precached, CDN assets (Tailwind, Google Fonts) are cached on first online visit.
const CACHE = 'kalimba-trainer-m2-2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:$/.test(new URL(req.url).protocol)) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) return hit;
      const res = await net;
      if (res) return res;
      return req.mode === 'navigate' ? (await cache.match('./index.html')) || Response.error() : Response.error();
    })
  );
});
