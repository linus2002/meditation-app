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
const BUILD = 'mwtaqpxc';
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
 *
 * A match must also run to a file extension, with parentheses allowed inside
 * the path: route groups put chunks under `app/(app)/...`, which a pattern
 * stopping at `)` cut to `app/(app`, so those screens' code was never cached.
 * And Next splits its page data across several script tags, sometimes in the
 * middle of a URL, so a fragment with no extension is not a file at all.
 */
function assetsFrom(html) {
  const found = new Set();
  const pattern =
    /\/_next\/static\/[^"'\s\\]+?\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|webp|avif|svg|ico|json|txt|wasm)(?=["'\s\\)?#]|$)/g;
  for (const match of html.matchAll(pattern)) {
    found.add(match[0]);
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
  // One retry: a single dropped request should not cost a whole update.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        // An unread body holds its connection open; enough of them and every
        // later request in the install waits for ever.
        if (response.body) await response.body.cancel().catch(() => undefined);
        continue;
      }
      await cache.put(url, response.clone());
      return response;
    } catch {
      // Tried again, then reported as missing.
    }
  }
  return null;
}

/** Whether an earlier build's copy is already on this device. */
async function hasEarlierBuild() {
  const keys = await caches.keys();
  return keys.some((key) => key.startsWith('serenity-') && key !== CACHE && key !== PINNED);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const manifest = await (await fetch(MANIFEST, { cache: 'no-store' })).json();
        const cache = await caches.open(CACHE);

        const routes = manifest.routes || [];
        const assets = new Set(manifest.assets || []);

        let missing = 0;
        await Promise.all(
          routes.map(async (route) => {
            const response = await cacheIfOk(cache, route);
            if (!response) {
              missing++;
              return;
            }
            // The chunks this page needs, read straight from its markup.
            for (const asset of assetsFrom(await response.text())) assets.add(asset);
          }),
        );

        await Promise.all(
          [...assets].map(async (asset) => {
            const response = await cacheIfOk(cache, asset);
            if (!response) missing++;
            // The cached copy is all that's needed; let this one go.
            else if (response.body) await response.body.cancel().catch(() => undefined);
          }),
        );

        /*
         * An update that arrived only in part must not take over: activating it
         * deletes the earlier build's cache, and the installed app would then
         * open offline with screens or code missing. Failing the install keeps
         * the working copy, and the browser tries the update again on a later
         * visit. A first install has nothing to protect, so it keeps what it got.
         */
        if (missing > 0 && (await hasEarlierBuild())) {
          await caches.delete(CACHE);
          throw new Error(`Update incomplete: ${missing} files missing`);
        }
      } catch (error) {
        if (error && String(error.message).startsWith('Update incomplete')) throw error;
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
    // A page reached by query string — `/program?id=…` — is the same
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

  // Video streams in byte ranges straight from the network. Caching tens of
  // megabytes behind a home-screen rail would crowd out everything else.
  if (request.destination === 'video') return;

  // A saved session's recording comes from Sanity's CDN: it is served from the
  // saved copy when there is one (in byte ranges, as audio players ask), and
  // otherwise straight from the network as before.
  if (url.origin === SANITY_CDN) {
    event.respondWith(savedOrNetwork(request));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.headers.has('range')) return;

  // The Android APK and the documentation PDF (offered on /get) are megabytes
  // each and must always be the newest copy, so they never touch a cache.
  if (url.pathname.endsWith('.apk') || url.pathname.endsWith('.pdf')) return;

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

const SANITY_CDN = 'https://cdn.sanity.io';

/** Only the app's own artwork and Sanity's files are ever saved alongside a session. */
function isSavableMedia(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === SANITY_CDN) return true;
    return parsed.origin === self.location.origin && parsed.pathname === '/_next/image';
  } catch {
    return false;
  }
}

/** The bytes a Range header asks for, or null when it can't be answered. */
function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start;
  let end;
  if (match[1] === '') {
    // "bytes=-500": the last 500 bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || end < start) return null;
  return { start, end };
}

/**
 * Answers from a saved copy, cutting out the bytes asked for.
 *
 * Audio elements ask for ranges ("bytes=0-", then wherever someone seeks), and
 * Safari refuses a whole-file 200 in reply to one, so a range request gets a
 * proper 206 cut from the stored file.
 */
async function savedOrNetwork(request) {
  const saved = await (await caches.open(PINNED)).match(request.url);
  if (!saved) return fetch(request);

  const header = request.headers.get('range');
  if (!header) return saved;

  const blob = await saved.blob();
  const range = byteRange(header, blob.size);
  if (!range) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  }
  return new Response(blob.slice(range.start, range.end + 1), {
    status: 206,
    headers: {
      'Content-Type': saved.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${range.start}-${range.end}/${blob.size}`,
      'Content-Length': String(range.end - range.start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

/*
 * Saves and removals run one at a time. Each reads the manifest, works, then
 * writes it back; two at once meant the second write erased the first
 * session's entry, and that download quietly vanished from the list.
 */
let queue = Promise.resolve();
function oneAtATime(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Plain words for what went wrong, shown on the player. */
function saveError(error) {
  if (error && (error.name === 'QuotaExceededError' || /quota/i.test(String(error.message)))) {
    return 'There isn’t room on this device to save it.';
  }
  return 'Part of this session couldn’t be downloaded. Check your connection and try again.';
}

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

  // Sanity's CDN allows this origin, so the copy is a readable whole file.
  const crossOrigin = new URL(url, self.location.origin).origin !== self.location.origin;
  const response = await fetch(url, crossOrigin ? { mode: 'cors', cache: 'no-store' } : { cache: 'no-store' });
  if (response.status !== 200) throw new Error(`Could not fetch ${url}`);

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
async function pinSession(id, route, media) {
  const cache = await caches.open(PINNED);

  const response = await fetch(route, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not fetch ${route}`);

  const html = await response.clone().text();
  const index = await readIndex(cache);

  const owned = new Set();
  for (const other of Object.values(index.sessions)) for (const url of other.urls) owned.add(url);

  // The recording and artwork the page itself uses: the artwork is drawn after
  // the page loads and the recording streams from Sanity, so neither is in the
  // HTML read here.
  const extra = (Array.isArray(media) ? media : []).filter(
    (url) => typeof url === 'string' && isSavableMedia(url),
  );
  const urls = [...new Set([route, ...assetsFrom(html), ...imagesFrom(html), ...extra])];
  const sizes = {};

  try {
    await cache.put(route, response.clone());
    sizes[route] = (await response.blob()).size;
    for (const url of urls.slice(1)) sizes[url] = await pinUrl(cache, url);
  } catch (error) {
    // Half a session is no use on a flight: take back what this save added.
    for (const url of urls) if (!owned.has(url)) await cache.delete(url);
    throw error;
  }

  let bytes = 0;
  for (const url of urls) {
    index.sizes[url] = sizes[url];
    bytes += sizes[url];
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
      oneAtATime(() => pinSession(message.id, message.route, message.media))
        .then((entry) => reply({ ok: true, entry }))
        .catch((error) => reply({ ok: false, error: saveError(error) })),
    );
    return;
  }

  if (message.type === 'unpin') {
    event.waitUntil(
      oneAtATime(() => unpinSession(message.id))
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
