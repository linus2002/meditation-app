/*
 * Serenity's service worker.
 *
 * `BUILD` is rewritten by `scripts/build-routes.mjs` on every build. That
 * matters more than it looks: a browser only installs a new worker when the
 * bytes of this file differ from the one it already has, so a worker that never
 * changes can never ship an update, however new the deployment behind it is.
 *
 * On install it walks every route in `precache.json`, caches the HTML, and
 * reads that HTML for the `/_next/static/...` files the page needs — caching
 * those too. Discovering the chunks from the markup, rather than from a
 * build-time manifest, means the list is always right for the deployment that
 * served it.
 */
const BUILD = 'mtthkowa';
const CACHE = `serenity-${BUILD}`;
const MANIFEST = '/precache.json';
const FALLBACK = '/offline';

/** Pulls `/_next/static/...` references out of a served HTML document. */
function assetsFrom(html) {
  const found = new Set();
  for (const match of html.matchAll(/["'(](\/_next\/static\/[^"')]+)["')]/g)) {
    found.add(match[1]);
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
        const cache = await caches.open(CACHE);

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
      // Take over without waiting for every tab to close. The page reloads
      // itself once we claim it, so there is no half-updated session.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('serenity-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Cache-first. Only for `/_next/static/...`, whose names carry a content hash. */
async function immutable(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    (await caches.open(CACHE)).put(request, response.clone());
  }
  return response;
}

/**
 * Network-first, for anything whose URL stays the same while its contents
 * change — every HTML document, and the manifest itself. Serving these from
 * cache first is what used to pin an installed app to an old deployment.
 */
async function fresh(request, { fallbackToOffline = false, noStore = false } = {}) {
  try {
    // Only the manifest gets `no-store`: passing any init alongside a navigation
    // Request downgrades its mode from "navigate", so those are fetched as-is.
    // The server sends `must-revalidate` for them, which is enough.
    const response = noStore ? await fetch(request, { cache: 'no-store' }) : await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      (await caches.open(CACHE)).put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToOffline) {
      const offline = await caches.match(FALLBACK);
      if (offline) return offline;
    }
    return Response.error();
  }
}

/** Instant from cache, refreshed behind the scenes. Everything else. */
async function revalidating(event, request) {
  const cached = await caches.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        (await caches.open(CACHE)).put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never serve our own update channel from a cache.
  if (url.pathname === MANIFEST || url.pathname === '/sw.js') {
    event.respondWith(fresh(request, { noStore: true }));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(immutable(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fresh(request, { fallbackToOffline: true }));
    return;
  }

  event.respondWith(revalidating(event, request));
});
