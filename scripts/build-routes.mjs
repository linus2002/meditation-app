/**
 * Writes the route list the service worker precaches, into `public/`.
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

const payload = {
  // Changes every build, so a deploy always supersedes the previous cache.
  version: `${Date.now().toString(36)}`,
  routes,
  assets: ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'],
};

await writeFile(
  path.join(root, 'public/precache.json'),
  JSON.stringify(payload, null, 2) + '\n',
  'utf8',
);

console.log(`[precache] ${routes.length} routes (${ids.length} sessions) @ ${payload.version}`);
