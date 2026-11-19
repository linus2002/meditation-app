/**
 * What the app's content is, and how it comes out of Sanity.
 *
 * Shared by the build (`scripts/sanity/pull.mjs`, which bakes a copy into
 * content.json) and by the running app (`src/content/live.ts`, which fetches a
 * fresh copy each time it opens), so the two can never disagree about a field.
 * Plain JavaScript because the build script runs it in Node without a compiler;
 * the types live beside it in sanity-content.d.mts.
 */

export const PROJECT_ID = 'jn0rojao';
export const DATASET = 'production';
/** The CDN edge, not the live API: cached, fast, and fine for a public dataset. */
export const CONTENT_API = `https://${PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${DATASET}`;

/**
 * Sanity's image pipeline: capped at 1080px, the widest a 430px phone screen
 * draws at 2.5x density, as WebP. The format is fixed rather than `auto`
 * because Next's optimiser fetches without an Accept header, and `auto` then
 * hands it the original (often a multi-megabyte PNG) that times out under load.
 * The mobile loader swaps this for `auto` per width, since a WebView does send
 * Accept.
 */
const IMAGE_PARAMS = 'w=1080&fit=max&fm=webp&q=80';

/** Every image comes back with what next/image needs: size and a blur preview. */
const IMG = `{ "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height, "lqip": asset->metadata.lqip, "hotspot": hotspot }`;

/** Published documents only: a draft being edited in the Studio never reaches the app. */
const PUBLISHED = `!(_id in path("drafts.**"))`;

export const CONTENT_QUERY = `{
  "meditations": *[_type == "meditation" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, subtitle, narrator, category, durationMinutes, tone,
    "image": image${IMG}, imageAlt, "cover": cover${IMG}, coverFocus, soundscape,
    description, isSleep, isDailyGoal, inLibrary,
    "breathPattern": breathPattern[]{ label, seconds },
    "recording": recording{ "src": audio.asset->url, duration }
  },
  "programs": *[_type == "program" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, author, level, description, scrim, featured,
    "sessionIds": sessions[]->slug.current, "image": image${IMG}
  },
  "stories": *[_type == "story" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, description, category, voice, featured,
    "image": image${IMG}, "cover": cover${IMG}, imageAlt, soundscape, paragraphs,
    "narration": narration{ "src": audio.asset->url, duration, paragraphStarts }
  },
  "yoga": *[_type == "yogaSession" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, subtitle, focus, level, "image": image${IMG}, imageAlt,
    soundscape, description,
    "poses": poses[]{ name, seconds, cue, side,
      "voice": voice{ "name": name.asset->url, "cue": cue.asset->url, "next": next.asset->url } }
  },
  "videos": *[_type == "homeVideo" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, eyebrow, "src": video.asset->url, "poster": poster${IMG}
  },
  "categories": *[_type == "category" && ${PUBLISHED}] | order(order asc) {
    slug, name, sessionCount, icon, tone, "image": image${IMG}
  },
  "deckCards": *[_type == "deckCard" && defined(slug.current) && ${PUBLISHED}] | order(order asc) {
    "id": slug.current, title, caption, href, tone, "image": image${IMG}
  },
  "inspirations": *[_type == "inspiration" && ${PUBLISHED}] | order(order asc) { "id": key, text, tags },
  "reflectionPrompts": *[_type == "reflectionPrompt" && ${PUBLISHED}] | order(order asc) { "id": key, question },
  "home": *[_id == "homePage"][0] {
    "recommended": recommended[]{ "id": meditation->slug.current, collection, "image": image${IMG} },
    "today": today[]{ "id": meditation->slug.current, rating }
  }
}`;

/** Points one image at Sanity's CDN and returns what the app needs. */
function cdnImage(image) {
  if (!image?.url) return undefined;
  return {
    src: `${image.url}?${IMAGE_PARAMS}`,
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

const withImages = (items, keys) =>
  (items ?? []).map((item) => {
    const next = { ...item };
    for (const key of keys) next[key] = cdnImage(item[key]);
    return next;
  });

/**
 * Turns Sanity's raw answer into the app's content, stamped with when it was
 * fetched. Throws when the answer is clearly unusable, so a half-empty dataset
 * can never replace good content.
 */
export function shapeContent(result, pulledAt = new Date().toISOString()) {
  if (!result?.meditations?.length) throw new Error('Sanity returned no meditations');
  return compact({
    pulledAt,
    meditations: withImages(result.meditations, ['image', 'cover']),
    programs: withImages(result.programs, ['image']),
    stories: withImages(result.stories, ['image', 'cover']),
    yoga: withImages(result.yoga, ['image']),
    videos: withImages(result.videos, ['poster']).map((video) => ({ ...video, poster: video.poster?.src })),
    categories: withImages(result.categories, ['image']),
    deckCards: withImages(result.deckCards, ['image']),
    inspirations: result.inspirations ?? [],
    reflectionPrompts: result.reflectionPrompts ?? [],
    home: {
      recommended: withImages(result.home?.recommended, ['image']),
      today: result.home?.today ?? [],
    },
  });
}

/** Asks Sanity for the current published content. */
export async function fetchContent(init) {
  const response = await fetch(`${CONTENT_API}?query=${encodeURIComponent(CONTENT_QUERY)}`, init);
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`);
  const { result } = await response.json();
  return shapeContent(result);
}
