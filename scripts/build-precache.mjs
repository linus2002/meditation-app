/**
 * Writes the list the service worker precaches on install.
 *
 * Caching route HTML alone is not enough: the documents reference
 * content-hashed chunks that the browser only fetches when it actually renders
 * the page. So the JS is read out of Next's build manifest and cached
 * alongside, which is what lets a route work offline before it has ever been
 * opened.
 *
 * Runs after `next build`, writing into `public/` — served straight from disk
 * by `next start`, so a post-build write is picked up.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, '.next');

if (!existsSync(path.join(nextDir, 'app-build-manifest.json'))) {
  console.log('[precache] no build manifest — skipping (static export or no build)');
  process.exit(0);
}

const buildId = (await readFile(path.join(nextDir, 'BUILD_ID'), 'utf8')).trim();
const appManifest = JSON.parse(
  await readFile(path.join(nextDir, 'app-build-manifest.json'), 'utf8'),
);

/** Every JS chunk any route needs. */
const chunks = new Set();
for (const files of Object.values(appManifest.pages)) {
  for (const file of files) chunks.add(`/_next/${file}`);
}

/**
 * Routes come from the prerendered HTML rather than the manifest keys: the
 * emitted filenames are already the real URLs, with route groups like `(app)`
 * stripped and every dynamic player path expanded.
 */
async function collectRoutes(dir, base = '') {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...(await collectRoutes(path.join(dir, entry.name), `${base}/${entry.name}`)));
    } else if (entry.name.endsWith('.html')) {
      const name = entry.name.replace(/\.html$/, '');
      if (name === '_not-found') continue;
      found.push(name === 'index' ? base || '/' : `${base}/${name}`);
    }
  }
  return found;
}

const appDir = path.join(nextDir, 'server/app');
const routes = existsSync(appDir) ? await collectRoutes(appDir) : [];

/** Fonts and CSS emitted by the build. */
const media = [];
const cssDir = path.join(nextDir, 'static/css');
if (existsSync(cssDir)) {
  for (const file of await readdir(cssDir)) media.push(`/_next/static/css/${file}`);
}
const mediaDir = path.join(nextDir, 'static/media');
if (existsSync(mediaDir)) {
  for (const file of await readdir(mediaDir)) {
    // Fonts only — the photography is large and loads fine on demand.
    if (/\.(woff2?|ttf|otf)$/i.test(file)) media.push(`/_next/static/media/${file}`);
  }
}

const shell = ['/offline', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const payload = {
  version: buildId,
  urls: [...new Set([...routes, ...shell, ...chunks, ...media])],
};

await writeFile(
  path.join(root, 'public/precache.json'),
  JSON.stringify(payload, null, 2) + '\n',
  'utf8',
);

console.log(
  `[precache] ${payload.urls.length} entries (${routes.length} routes, ${chunks.size} chunks) @ ${buildId}`,
);
