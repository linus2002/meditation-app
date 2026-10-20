/**
 * Pulls the published content from Sanity into the app, ready for a build.
 *
 * Run with: npm run content:pull (the build scripts run it first).
 *
 * Writes `src/content/content.json`, which every module under src/data reads,
 * and downloads each image into `public/content/images/`, so the website and
 * the APK carry their pictures with them and keep working offline. Videos are
 * left on Sanity's CDN and streamed, which is what keeps them out of the APK.
 *
 * The dataset is public, so no token is needed. If Sanity cannot be reached the
 * build carries on with the content.json already in the repo, so a network
 * blip never breaks a deploy; it just ships the last content pulled.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ID = 'jn0rojao';
const DATASET = 'production';
const API = `https://${PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${DATASET}`;

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'src/content/content.json');
const IMAGE_DIR = path.join(ROOT, 'public/content/images');
const IMAGE_URL = '/content/images';

/** Every image comes back with what next/image needs: size and a blur preview. */
const IMG = `{ "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height, "lqip": asset->metadata.lqip, "hotspot": hotspot }`;

const QUERY = `{
  "meditations": *[_type == "meditation" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, subtitle, narrator, category, durationMinutes, tone,
    "image": image${IMG}, imageAlt, "cover": cover${IMG}, coverFocus, soundscape,
    description, isSleep, isDailyGoal, inLibrary,
    "breathPattern": breathPattern[]{ label, seconds }
  },
  "programs": *[_type == "program" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, author, level, description, scrim,
    "sessionIds": sessions[]->slug.current, "image": image${IMG}
  },
  "stories": *[_type == "story" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, description, category, voice,
    "image": image${IMG}, imageAlt, soundscape, paragraphs
  },
  "yoga": *[_type == "yogaSession" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, subtitle, focus, level, "image": image${IMG}, imageAlt,
    soundscape, description, "poses": poses[]{ name, seconds, cue, side }
  },
  "videos": *[_type == "homeVideo" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, eyebrow, "src": video.asset->url, "poster": poster${IMG}
  },
  "categories": *[_type == "category"] | order(order asc) {
    slug, name, sessionCount, icon, tone, "image": image${IMG}
  },
  "deckCards": *[_type == "deckCard" && defined(slug.current)] | order(order asc) {
    "id": slug.current, title, caption, href, tone, "image": image${IMG}
  },
  "inspirations": *[_type == "inspiration"] | order(order asc) { "id": key, text, tags },
  "reflectionPrompts": *[_type == "reflectionPrompt"] | order(order asc) { "id": key, question },
  "home": *[_id == "homePage"][0] {
    "recommended": recommended[]{ "id": meditation->slug.current, collection, "image": image${IMG} },
    "today": today[]{ "id": meditation->slug.current, rating }
  }
}`;

/** Downloads one image once, named by its content, and returns what the app needs. */
async function localImage(image, used) {
  if (!image?.url) return undefined;
  const ext = path.extname(new URL(image.url).pathname) || '.jpg';
  const name = createHash('sha1').update(image.url).digest('hex').slice(0, 16) + ext;
  const file = path.join(IMAGE_DIR, name);
  used.add(name);
  if (!existsSync(file)) {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error(`Image download failed (${response.status}): ${image.url}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  return {
    src: `${IMAGE_URL}/${name}`,
    width: image.width,
    height: image.height,
    ...(image.lqip ? { blurDataURL: image.lqip } : {}),
    // Sanity's hotspot, as a CSS object-position, where the editor set one.
    ...(image.hotspot ? { focus: `${Math.round(image.hotspot.x * 100)}% ${Math.round(image.hotspot.y * 100)}%` } : {}),
  };
}

/** Drops nulls Sanity returns for unset optional fields, so the JSON stays clean. */
function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== null && entry !== undefined)
        .map(([key, entry]) => [key, compact(entry)]),
    );
  }
  return value;
}

async function main() {
  const response = await fetch(`${API}?query=${encodeURIComponent(QUERY)}`);
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`);
  const { result } = await response.json();
  if (!result?.meditations?.length) throw new Error('Sanity returned no meditations; is the import done?');

  mkdirSync(IMAGE_DIR, { recursive: true });
  const used = new Set();
  const withImages = async (items, keys) =>
    Promise.all(
      (items ?? []).map(async (item) => {
        const next = { ...item };
        for (const key of keys) next[key] = await localImage(item[key], used);
        return next;
      }),
    );

  const content = {
    meditations: await withImages(result.meditations, ['image', 'cover']),
    programs: await withImages(result.programs, ['image']),
    stories: await withImages(result.stories, ['image']),
    yoga: await withImages(result.yoga, ['image']),
    videos: (await withImages(result.videos, ['poster'])).map((video) => ({ ...video, poster: video.poster?.src })),
    categories: await withImages(result.categories, ['image']),
    deckCards: await withImages(result.deckCards, ['image']),
    inspirations: result.inspirations ?? [],
    reflectionPrompts: result.reflectionPrompts ?? [],
    home: {
      recommended: await withImages(result.home?.recommended, ['image']),
      today: result.home?.today ?? [],
    },
  };

  mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(compact(content), null, 2) + '\n');

  // Images no longer used by any document are removed, so the bundle never grows stale.
  for (const name of readdirSync(IMAGE_DIR)) {
    if (!used.has(name)) rmSync(path.join(IMAGE_DIR, name));
  }

  const summary = Object.entries(content)
    .map(([key, value]) => `${key} ${Array.isArray(value) ? value.length : `${value.recommended.length}+${value.today.length}`}`)
    .join(', ');
  console.log(`content: pulled from Sanity (${summary}; ${used.size} images)`);
}

main().catch((error) => {
  if (existsSync(OUT_JSON)) {
    console.warn(`content: could not reach Sanity (${error.message}); building with the content already in the repo.`);
    return;
  }
  console.error(`content: ${error.message}`);
  process.exit(1);
});
