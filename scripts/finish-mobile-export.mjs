/**
 * Moves the mobile static export into `out/`, which Capacitor bundles into the apps.
 *
 * The mobile build exports into its own folder (`.next-mobile`, see next.config.mjs)
 * so it can run while `next dev` is using `.next`. A static export copies all of
 * `public/`, so this also leaves out what must not ship inside the apps:
 *   - the website's install pages and the APK itself (/get, /iphone);
 *   - recordings kept locally in public/ but streamed from Sanity in the app
 *     (the gitignored folders), which would add hundreds of megabytes.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const from = path.join(root, '.next-mobile');
const to = path.join(root, 'out');

const WEB_ONLY = ['get', 'iphone.html'];
const STREAMED = [
  'the-six-phase', 'sleep-mastery', 'a-steady-mind', 'open-water', 'calm-foundations',
  'kind-to-yourself', 'better-mornings', 'breath-school', 'focus-reset',
  'letting-go-of-stress', 'meditations',
];
const skip = new Set([...WEB_ONLY, ...STREAMED].map((p) => path.join(from, p)));

if (!fs.existsSync(path.join(from, 'index.html'))) {
  throw new Error('.next-mobile has no index.html: run the mobile build first.');
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true, filter: (src) => !skip.has(src) });
console.log(`[mobile] export copied to out/ without ${[...WEB_ONLY, ...STREAMED].length} web-only or streamed paths`);
