/*
 * Serenity's service worker.
 *
 * On install it precaches every route and every JS chunk the build emitted
 * (see scripts/build-precache.mjs), so the whole app works offline from the
 * first visit — not only the screens you happened to open. Afterwards it serves
 * stale-while-revalidate: instant from cache, refreshed in the background.
 *
 * The cache is named for the build id, so a new deploy installs alongside the
 * old one and the previous cache is dropped only once the new worker is in
 * charge.
 */
const PRECACHE_URL = '/precache.json';
const FALLBACK = '/offline';

let cacheName = 'serenity-fallback';

async function openCache() {
  return caches.open(cacheName);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch(PRECACHE_URL, { cache: 'no-store' });
        const { version, urls } = await response.json();
        cacheName = `serenity-${version}`;
        const cache = await caches.open(cacheName);

        // Individually, so one missing asset cannot fail the whole install.
        await Promise.all(
          urls.map(async (url) => {
            try {
              const res = await fetch(url, { cache: 'no-store' });
              if (res.ok) await cache.put(url, res);
            } catch {
              /* Skipped; the runtime handler will pick it up later. */
            }
          }),
        );
      } catch {
        // No manifest (dev, or a failed fetch) — fall back to runtime caching.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Re-read the version: `activate` may run in a fresh worker instance.
      try {
        const res = await caches.match(PRECACHE_URL);
        const stored = res ? await res.json() : null;
        if (stored?.version) cacheName = `serenity-${stored.version}`;
      } catch {
        /* Keeps whatever name install set. */
      }

      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('serenity-') && key !== cacheName).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: false });

      const network = fetch(request)
        .then(async (response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cache = await openCache();
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Stale-while-revalidate: answer now, refresh behind the scenes.
        event.waitUntil(network);
        return cached;
      }

      const fresh = await network;
      if (fresh) return fresh;

      // Nothing cached and no connection. Navigations get the offline page;
      // anything else fails as it normally would.
      if (request.mode === 'navigate') {
        const fallback = await caches.match(FALLBACK);
        if (fallback) return fallback;
      }
      return Response.error();
    })(),
  );
});
