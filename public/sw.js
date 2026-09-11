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
const BUILD = 'mtuxaiu1';
const CACHE = `serenity-${BUILD}`;
const MANIFEST = '/precache.json';
const FALLBACK = '/offline';

/*
 * Sessions the reader has explicitly saved for offline.
 *
 * Deliberately outside the build-stamped cache above, and skipped by the
 * activate handler's sweep: a saved session has to survive a deploy. Someone
 * who saved a session before a flight should not lose it because the site
 * shipped an update while they were at the gate.
 *
 * Nothing in the fetch handler reads this cache by name. `caches.match()`
 * searches every cache in the origin, so the existing offline fallbacks find
 * pinned entries on their own.
 */
const PINNED = 'serenity-pinned-v1';

/** The pinned cache keeps its own manifest, stored as an entry inside itself. */
const PINNED_INDEX = '/__pinned__';

/**
 * Pulls `/_next/static/...` references out of a served HTML document.
 *
 * The trailing backslash matters. Next embeds a JSON copy of the page data in
 * the markup, where the same URLs appear inside escaped strings — `\"/_next/...
 * .css\"` — and a pattern that stops only at the quote swallows the backslash
 * before it. The result is a URL that 404s every time it is fetched.
 */
function assetsFrom(html) {
  const found = new Set();
  for (const match of html.matchAll(/["'(](\/_next\/static\/[^"')\\]+)["')\\]/g)) {
    found.add(match[1]);
  }
  return [...found];
}

/**
 * Pulls the artwork out of a served HTML document.
 *
 * This is the half `assetsFrom` cannot see. On the web build every photograph
 * goes through the image optimiser and arrives as `/_next/image?url=...`, which
 * is not under `/_next/static/` and so was never precached — the one thing that
 * actually breaks a session with no network. A static export serves the files
 * directly instead, hence the second pattern.
 *
 * Every `srcset` candidate is taken, not just the one in `src`. The device
 * chooses by pixel density and viewport, and a variant that is missing offline
 * is a blank rectangle where the artwork should be. They are cheap: the whole
 * ladder for one photograph runs to a few hundred kilobytes, because the
 * optimiser stops resizing once it reaches the original's own width.
 *
 * `srcset` separates candidates with commas and follows each with a width
 * descriptor, which is why whitespace and commas end a match — and a backslash
 * does too, for the escaped-JSON reason described above `assetsFrom`.
 */
function imagesFrom(html) {
  const found = new Set();
  for (const match of html.matchAll(/\/_next\/image\?[^"'\s,)\\]+/g)) {
    found.add(match[0].replace(/&amp;/g, '&'));
  }
  for (const match of html.matchAll(/\/_next\/static\/media\/[^"'\s,)\\]+/g)) {
    found.add(match[0]);
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
          // PINNED is spared: it holds what the reader chose to keep, not what
          // this deployment happens to need.
          .filter((key) => key.startsWith('serenity-') && key !== CACHE && key !== PINNED)
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
    // A page reached by query string — `/circles/view?id=…` — is the same
    // document for every id, so offline it can be served from any cached copy.
    const cached =
      (await caches.match(request)) ||
      (request.mode === 'navigate' ? await caches.match(request, { ignoreSearch: true }) : undefined);
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

/* ------------------------------------------------------------------ *
 * Saved sessions
 * ------------------------------------------------------------------ */

/**
 * The pinned manifest.
 *
 * `sessions` maps a session id to the URLs it needs, and `sizes` maps a URL to
 * its bytes. The sizes are kept once per URL rather than once per session
 * because sessions share nearly all of their JavaScript: adding up what each
 * session needs would count those shared chunks again for every session and
 * report a device using half as much space as it really is.
 */
async function readIndex(cache) {
  try {
    const response = await cache.match(PINNED_INDEX);
    const parsed = response ? await response.json() : null;
    return { sessions: (parsed && parsed.sessions) || {}, sizes: (parsed && parsed.sizes) || {} };
  } catch {
    return { sessions: {}, sizes: {} };
  }
}

async function writeIndex(cache, index) {
  await cache.put(
    PINNED_INDEX,
    new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json' } }),
  );
}

/**
 * Stores one URL in the pinned cache and reports what it cost.
 *
 * A URL already pinned by another session is measured, not refetched: the JS
 * chunks are shared by every session, and re-downloading them once per save
 * would make the second save look as expensive as the first.
 */
async function pinUrl(cache, url) {
  const existing = await cache.match(url);
  if (existing) return (await existing.blob()).size;

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return 0;

  const size = (await response.clone().blob()).size;
  await cache.put(url, response);
  return size;
}

/**
 * Saves one session: its page, the chunks that page needs, and its artwork.
 *
 * The asset list is read out of the served HTML rather than from a build
 * manifest, exactly as the install-time precache does — so the list is always
 * right for the deployment that answered, and cannot go stale.
 */
async function pinSession(id, route) {
  const cache = await caches.open(PINNED);

  const response = await fetch(route, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not fetch ${route}`);

  const html = await response.clone().text();
  const index = await readIndex(cache);

  index.sizes[route] = (await response.clone().blob()).size;
  await cache.put(route, response);

  const urls = [route];
  let bytes = index.sizes[route];

  for (const url of [...assetsFrom(html), ...imagesFrom(html)]) {
    urls.push(url);
    const size = await pinUrl(cache, url);
    index.sizes[url] = size;
    bytes += size;
  }

  // `bytes` is this session's whole footprint, shared chunks included — what it
  // would need if it were the only thing saved. The device total is computed
  // from `sizes` instead, so those shared chunks are counted exactly once.
  index.sessions[id] = { urls, bytes, savedAt: Date.now() };
  await writeIndex(cache, index);

  return index.sessions[id];
}

/**
 * Removes a session, keeping anything another saved session still needs.
 *
 * Sessions share almost all of their JS. Deleting one session's URL list
 * wholesale would quietly break every other saved session, and the damage would
 * only show up on the flight where it mattered.
 */
async function unpinSession(id) {
  const cache = await caches.open(PINNED);
  const index = await readIndex(cache);

  const entry = index.sessions[id];
  if (!entry) return;

  delete index.sessions[id];

  const stillNeeded = new Set();
  for (const other of Object.values(index.sessions)) {
    for (const url of other.urls) stillNeeded.add(url);
  }

  for (const url of entry.urls) {
    if (stillNeeded.has(url)) continue;
    await cache.delete(url);
    delete index.sizes[url];
  }

  await writeIndex(cache, index);
}

async function pinnedStatus() {
  const cache = await caches.open(PINNED);
  const index = await readIndex(cache);

  const sessions = Object.entries(index.sessions).map(([id, entry]) => ({
    id,
    bytes: entry.bytes || 0,
    savedAt: entry.savedAt || 0,
  }));

  // Summed over URLs, not over sessions, so a chunk two sessions share is one
  // entry on the device and one entry in this figure.
  let bytes = 0;
  for (const size of Object.values(index.sizes)) bytes += size || 0;

  return { sessions, bytes };
}

/**
 * The page asks, the worker answers down the port it was handed.
 *
 * Every reply carries `ok`, so a caller never has to distinguish between a
 * failure and a message that simply never came back.
 */
self.addEventListener('message', (event) => {
  const message = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (payload) => port && port.postMessage(payload);

  if (message.type === 'pin') {
    event.waitUntil(
      pinSession(message.id, message.route)
        .then((entry) => reply({ ok: true, entry }))
        .catch((error) => reply({ ok: false, error: String(error && error.message) })),
    );
    return;
  }

  if (message.type === 'unpin') {
    event.waitUntil(
      unpinSession(message.id)
        .then(() => reply({ ok: true }))
        .catch((error) => reply({ ok: false, error: String(error && error.message) })),
    );
    return;
  }

  if (message.type === 'pinned-status') {
    event.waitUntil(
      pinnedStatus()
        .then((status) => reply({ ok: true, ...status }))
        .catch((error) => reply({ ok: false, error: String(error && error.message) })),
    );
  }
});

/*
 * A tap on a reminder.
 *
 * Reuses an open window wherever there is one — an installed app that is merely
 * backgrounded should come forward on the right screen, not open a second copy
 * of itself — and falls back to opening the app at the reminder's destination.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!('focus' in client)) continue;
        if ('navigate' in client) {
          await client.navigate(target).catch(() => {});
        }
        return client.focus();
      }

      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })(),
  );
});
