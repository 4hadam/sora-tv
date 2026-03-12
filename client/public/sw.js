// bump this version when you deploy a new release (or use a build hash)
const CACHE_NAME = 'soratv-v2';
const OFFLINE_URL = '/';

const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-96x96.png',
    '/android-chrome-192.png',
    '/android-chrome-512.png',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Don't cache stream URLs (HLS/M3U8)
    if (url.pathname.endsWith('.m3u8') || url.hostname.includes('stream-lb') || url.hostname.includes('livemediama')) {
        return;
    }

    // Network-first for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Use network-first for navigations (index.html) so clients receive updates quickly.
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // update cache for offline fallback
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Cache-first for other static assets (images, fonts, etc.)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});
