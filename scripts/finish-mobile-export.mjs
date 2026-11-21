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
const skip = new Set(WEB_ONLY.map((p) => path.join(from, p)));
const publicDir = path.join(root, 'public');

/**
 * A streamed folder can share its name with a screen: public/meditations/ holds
 * recordings, and the Meditations tab exports to meditations/index.html. So only
 * files that came from public/ are left out, never the pages beside them.
 */
function isStreamedFile(src) {
  const rel = path.relative(from, src);
  const top = rel.split(path.sep)[0];
  if (!STREAMED.includes(top)) return false;
  const original = path.join(publicDir, rel);
  return fs.existsSync(original) && fs.statSync(original).isFile();
}

if (!fs.existsSync(path.join(from, 'index.html'))) {
  throw new Error('.next-mobile has no index.html: run the mobile build first.');
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true, filter: (src) => !skip.has(src) && !isStreamedFile(src) });

// Every screen must make it into the apps; a missing one crashes the app when opened.
for (const page of ['index.html', 'home/index.html', 'meditations/index.html', 'yoga/index.html', 'sleep/index.html', 'kapwa/index.html', 'profile/index.html', 'help/index.html']) {
  if (!fs.existsSync(path.join(to, page))) throw new Error(`[mobile] ${page} is missing from out/`);
}
console.log(`[mobile] export copied to out/ without the web-only pages or the streamed recordings`);
