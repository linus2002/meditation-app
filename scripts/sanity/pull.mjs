/**
 * Pulls the published content from Sanity into the app, ready for a build.
 *
 * Run with: npm run content:pull (the build scripts run it first).
 *
 * Writes `src/content/content.json`: the copy built into the app, used on first
 * launch and whenever the phone is offline. The running app then fetches a
 * fresh copy itself (src/content/live.ts), so edits made in the Studio reach
 * installed apps without a new build. Both sides shape the content with the
 * same code, in src/content/sanity-content.mjs.
 *
 * Images, videos, narration and recordings all stay on Sanity's CDN and load
 * over the network, which is what keeps them out of the APK.
 *
 * The dataset is public, so no token is needed. If Sanity cannot be reached the
 * build carries on with the content.json already in the repo, so a network
 * blip never breaks a deploy; it just ships the last content pulled.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { fetchContent } from '../../src/content/sanity-content.mjs';

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'src/content/content.json');
/** Where images used to be downloaded to; removed on every pull so none ship. */
const LEGACY_IMAGE_DIR = path.join(ROOT, 'public/content/images');

async function main() {
  const content = await fetchContent();

  mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(content, null, 2) + '\n');

  // Images now load from the CDN, so any left from older pulls would only bloat the APK.
  rmSync(LEGACY_IMAGE_DIR, { recursive: true, force: true });

  const summary = Object.entries(content)
    .filter(([key]) => key !== 'pulledAt')
    .map(([key, value]) => `${key} ${Array.isArray(value) ? value.length : `${value.recommended.length}+${value.today.length}`}`)
    .join(', ');
  console.log(`content: pulled from Sanity (${summary})`);
}

main().catch((error) => {
  if (existsSync(OUT_JSON)) {
    console.warn(`content: could not reach Sanity (${error.message}); building with the content already in the repo.`);
    return;
  }
  console.error(`content: ${error.message}`);
  process.exit(1);
});
