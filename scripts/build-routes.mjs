/**
 * Writes the route list the service worker precaches, into `public/`, and
 * stamps the same build id into `public/sw.js`.
 *
 * Stamping the worker is what makes a deploy actually reach an installed PWA: a
 * browser compares the bytes of `/sw.js` against the copy it is already running
 * and does nothing at all when they match, so a worker that is byte-identical
 * every build can never hand out an update.
 *
 * This runs as `prebuild` — before `next build` — on purpose. Generating it
 * afterwards means writing into `public/` once the build has already consumed
 * that directory, so the file never reaches the deployment. Deriving the routes
 * from source rather than from `.next` is what makes running early possible.
 *
 * The worker discovers each route's JS itself by reading the HTML it fetches,
 * so no chunk names are needed here.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'src/app');

/** Every `page.tsx`, mapped to the URL it will be served at. */
async function collectRoutes(dir, base = '') {
  const routes = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups — `(app)` — are organisational and absent from the URL.
      const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
      const segment = isGroup ? base : `${base}/${entry.name}`;
      routes.push(...(await collectRoutes(path.join(dir, entry.name), segment)));
    } else if (entry.name === 'page.tsx') {
      routes.push(base || '/');
    }
  }
  return routes;
}

const found = await collectRoutes(appDir);

// `/player/[id]` is expanded from the catalogue, which is the only dynamic
// route and is fully prerendered by generateStaticParams.
const catalogue = await readFile(path.join(root, 'src/data/meditations.ts'), 'utf8');
const ids = [...catalogue.matchAll(/^\s{4}id: '([^']+)',$/gm)].map((m) => m[1]);

const routes = [
  ...found.filter((route) => !route.includes('[')),
  ...ids.map((id) => `/player/${id}`),
].sort();

/*
 * Prefer the commit SHA the host exposes, so two builds of the same commit
 * produce the same worker and a redeploy does not churn every client's cache.
 * Locally there is no SHA, so fall back to the clock.
 */
const version = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  Date.now().toString(36)
).slice(0, 12);

const payload = {
  // Changes every deploy, so a deploy always supersedes the previous cache.
  version,
  routes,
  assets: ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'],
};

await writeFile(
  path.join(root, 'public/precache.json'),
  JSON.stringify(payload, null, 2) + '\n',
  'utf8',
);

// Rewrite the worker's `BUILD` in place. Matching any current value keeps this
// idempotent, so re-running over an already-stamped file is fine.
const swPath = path.join(root, 'public/sw.js');
const sw = await readFile(swPath, 'utf8');
const stamped = sw.replace(/^const BUILD = '[^']*';$/m, `const BUILD = '${version}';`);

if (stamped === sw && !sw.includes(`const BUILD = '${version}';`)) {
  throw new Error('public/sw.js has no `const BUILD = \'...\';` line to stamp.');
}

await writeFile(swPath, stamped, 'utf8');

console.log(`[precache] ${routes.length} routes (${ids.length} sessions) @ ${version}`);
