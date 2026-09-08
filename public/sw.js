/*
 * Serenity's service worker.
 *
 * On install it walks every route in `precache.json`, caches the HTML, and
 * reads that HTML for the `/_next/static/...` files the page needs — caching
 * those too. Discovering the chunks from the markup, rather than from a
 * build-time manifest, means the list is always right for the deployment that
 * served it and nothing has to be generated after the build.
 *
 * After install it serves stale-while-revalidate: instant from cache, refreshed
 * behind the scenes.
 */
const MANIFEST = '/precache.json';
const FALLBACK = '/offline';
const VERSION_KEY = '/__serenity_version__';

let cacheName = 'serenity-v1';

/** Pulls `/_next/static/...` references out of a served HTML document. */
function assetsFrom(html) {
  const found = new Set();
  for (const match of html.matchAll(/["'(](\/_next\/static\/[^"')]+)["')]/g)) {
    found.add(match[1].replace(/\u002F/g, '/'));
  }
  return [...found];
}

async function cacheIfOk(cache, url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    await cache.put(url, response.clone());
    return response;
  } catch {
    return null;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const manifest = await (await fetch(MANIFEST, { cache: 'no-store' })).json();
        cacheName = `serenity-${manifest.version}`;
        const cache = await caches.open(cacheName);

        // Remember the version so `activate` can find this cache again.
        await cache.put(VERSION_KEY, new Response(cacheName));

        const routes = manifest.routes || [];
        const assets = new Set(manifest.assets || []);

        await Promise.all(
          routes.map(async (route) => {
            const response = await cacheIfOk(cache, route);
            if (!response) return;
            // The chunks this page needs, read straight from its markup.
            for (const asset of assetsFrom(await response.text())) assets.add(asset);
          }),
        );

        await Promise.all([...assets].map((asset) => cacheIfOk(cache, asset)));
      } catch {
        // No manifest reachable — fall back to runtime caching alone.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const stored = await caches.match(VERSION_KEY);
      if (stored) cacheName = (await stored.text()).trim();

      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('serenity-') && key !== cacheName)
          .map((key) => caches.delete(key)),
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
      const cached = await caches.match(request);

      const network = fetch(request)
        .then(async (response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            (await caches.open(cacheName)).put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      const fresh = await network;
      if (fresh) return fresh;

      // Nothing cached and no connection: navigations get the offline screen.
      if (request.mode === 'navigate') {
        const fallback = await caches.match(FALLBACK);
        if (fallback) return fallback;
      }
      return Response.error();
    })(),
  );
});
