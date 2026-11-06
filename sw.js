// Offline cache: app shell is precached, CDN assets (Tailwind, Google Fonts) are cached on first online visit.
const CACHE = 'kalimba-trainer-v3-30';
// the photo reader (Tesseract, ~8 MB) is fetched on first use and kept across app updates
const OCR_CACHE = 'kalimba-ocr-v1';
const SHELL = [
  './',
  './css/app.css',
  './js/i18n.js',
  './js/icons.js',
  './js/core.js',
  './js/app.js',
  './js/sheetread.js',
  './manifest.webmanifest',
  './icons/favicon-32.png',
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:$/.test(new URL(req.url).protocol)) return;
  if (new URL(req.url).pathname.includes('/vendor/tesseract/')) {
    // cache-first: these files never change for a given OCR_CACHE name
    e.respondWith(caches.open(OCR_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const net = fetch(req)
        .then(res => {
          // Cloudflare Pages redirects /index.html to /; a redirected response must never answer a navigation
          if (res && !res.redirected && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) return hit;
      const res = await net;
      if (res) return res;
      return req.mode === 'navigate' ? (await cache.match('./')) || Response.error() : Response.error();
    })
  );
});
