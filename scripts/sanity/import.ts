/**
 * One-time import: copies the content built into the app (src/data) into Sanity.
 *
 * Run with: npm run content:import
 *
 * Safe to run again. Every document gets a fixed id derived from the app's own
 * id (`meditation-box-breathing`), so a second run replaces rather than
 * duplicates, and every file is uploaded once per run and reused wherever it
 * appears. Needs SANITY_API_WRITE_TOKEN in .env.local (an Editor token).
 *
 * Runs under vite-node with the test config, so `@/` resolves and image
 * imports come back as their source path, which is what gets uploaded.
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createClient, type SanityClient } from '@sanity/client';
import { Brain, CloudMoon, HeartPulse, Sparkles, Waves, Wind } from 'lucide-react';

import { categories, deckCards } from '@/data/categories';
import { inspirations } from '@/data/inspirations';
import { meditations, programSessions } from '@/data/meditations';
import { freePrograms } from '@/data/programs';
import { recommended } from '@/data/recommended';
import { reflectionPrompts } from '@/data/reflections';
import { stories } from '@/data/stories';
import { todaysPicks } from '@/data/today';
import { homeVideos } from '@/data/videos';
import { yogaSessions } from '@/data/yoga';

const PROJECT_ID = 'jn0rojao';
const DATASET = 'production';
const ROOT = process.cwd();

/** Reads one value from .env.local without printing anything. */
function envValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const file = path.join(ROOT, '.env.local');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || undefined;
}

const token = envValue('SANITY_API_WRITE_TOKEN');
if (!token) {
  console.error('SANITY_API_WRITE_TOKEN is missing from .env.local.');
  process.exit(1);
}

const client: SanityClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

/* ------------------------------------------------------------------ *
 * Files
 * ------------------------------------------------------------------ */

/**
 * Image imports arrive as a path ("/src/assets/images/x.png", or a
 * "/@fs/..." absolute path); videos and posters are public paths
 * ("/videos/x.mp4"). Both map to a file on disk.
 */
function fileOnDisk(source: unknown): string {
  const value = typeof source === 'string' ? source : (source as { src?: string })?.src;
  if (!value) throw new Error(`Not a file reference: ${JSON.stringify(source)}`);
  const clean = decodeURIComponent(value.split('?')[0]);
  const candidates = clean.startsWith('/@fs/')
    ? [clean.slice('/@fs/'.length), clean.slice('/@fs'.length)]
    : [path.join(ROOT, clean), path.join(ROOT, 'public', clean)];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`File not found for ${value}`);
  return found;
}

const uploaded = new Map<string, string>();

async function upload(kind: 'image' | 'file', source: unknown): Promise<string> {
  const file = fileOnDisk(source);
  const cached = uploaded.get(file);
  if (cached) return cached;
  const asset = await client.assets.upload(kind, createReadStream(file), {
    filename: path.basename(file),
  });
  uploaded.set(file, asset._id);
  console.log(`  uploaded ${path.basename(file)}`);
  return asset._id;
}

const image = async (source: unknown) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: await upload('image', source) },
});

const file = async (source: unknown) => ({
  _type: 'file',
  asset: { _type: 'reference', _ref: await upload('file', source) },
});

const slug = (current: string) => ({ _type: 'slug', current });
const ref = (id: string) => ({ _type: 'reference', _ref: id });
/** Array members need a stable `_key`. */
const keyed = <T extends object>(items: T[]) => items.map((item, index) => ({ _key: `k${index}`, ...item }));
const order = (index: number) => (index + 1) * 10;

const meditationDocId = (id: string) => `meditation-${id}`;

const ICON_NAMES = new Map<unknown, string>([
  [Brain, 'Brain'],
  [CloudMoon, 'CloudMoon'],
  [HeartPulse, 'HeartPulse'],
  [Sparkles, 'Sparkles'],
  [Waves, 'Waves'],
  [Wind, 'Wind'],
]);

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

async function buildDocuments() {
  const docs: Record<string, unknown>[] = [];

  console.log('Meditations');
  const sessions = [
    ...meditations.map((item) => ({ item, inLibrary: true })),
    ...programSessions.map((item) => ({ item, inLibrary: false })),
  ];
  for (const [index, { item, inLibrary }] of sessions.entries()) {
    docs.push({
      _id: meditationDocId(item.id),
      _type: 'meditation',
      title: item.title,
      slug: slug(item.id),
      inLibrary,
      subtitle: item.subtitle,
      narrator: item.narrator,
      category: item.category,
      durationMinutes: Math.round(item.durationSeconds / 60),
      tone: item.tone,
      image: await image(item.image),
      imageAlt: item.imageAlt,
      ...(item.cover ? { cover: await image(item.cover) } : {}),
      ...(item.coverFocus ? { coverFocus: item.coverFocus } : {}),
      soundscape: item.soundscape,
      description: item.description,
      breathPattern: keyed(item.breathPattern.map((phase) => ({ _type: 'breathPhase', ...phase }))),
      isSleep: Boolean(item.isSleep),
      isDailyGoal: Boolean(item.isDailyGoal),
      order: order(index),
    });
  }

  console.log('Programmes');
  for (const [index, program] of freePrograms.entries()) {
    docs.push({
      _id: `program-${program.id}`,
      _type: 'program',
      title: program.title,
      slug: slug(program.id),
      author: program.author,
      level: program.level,
      description: program.description,
      sessions: keyed(program.sessions.map((session) => ref(meditationDocId(session.id)))),
      image: await image(program.image),
      scrim: program.scrim,
      order: order(index),
    });
  }

  console.log('Stories');
  for (const [index, story] of stories.entries()) {
    docs.push({
      _id: `story-${story.id}`,
      _type: 'story',
      title: story.title,
      slug: slug(story.id),
      description: story.description,
      category: story.category,
      voice: story.voice,
      image: await image(story.image),
      imageAlt: story.imageAlt,
      soundscape: story.soundscape,
      paragraphs: story.paragraphs,
      order: order(index),
    });
  }

  console.log('Yoga');
  for (const [index, session] of yogaSessions.entries()) {
    docs.push({
      _id: `yoga-${session.id}`,
      _type: 'yogaSession',
      title: session.title,
      slug: slug(session.id),
      subtitle: session.subtitle,
      focus: session.focus,
      level: session.level,
      image: await image(session.image),
      imageAlt: session.imageAlt,
      soundscape: session.soundscape,
      description: session.description,
      poses: keyed(session.poses.map((pose) => ({ _type: 'pose', ...pose }))),
      order: order(index),
    });
  }

  console.log('Videos');
  for (const [index, video] of homeVideos.entries()) {
    docs.push({
      _id: `video-${video.id}`,
      _type: 'homeVideo',
      title: video.title,
      slug: slug(video.id),
      eyebrow: video.eyebrow,
      video: await file(video.src),
      poster: await image(video.poster),
      order: order(index),
    });
  }

  console.log('Categories and shortcuts');
  for (const [index, item] of categories.entries()) {
    const icon = ICON_NAMES.get(item.icon);
    if (!icon) throw new Error(`No icon name for category ${item.slug}`);
    docs.push({
      _id: `category-${item.slug}`,
      _type: 'category',
      slug: item.slug,
      name: item.name,
      sessionCount: item.sessionCount,
      icon,
      tone: item.tone,
      image: await image(item.image),
      order: order(index),
    });
  }
  for (const [index, card] of deckCards.entries()) {
    docs.push({
      _id: `deckCard-${card.id}`,
      _type: 'deckCard',
      title: card.title,
      slug: slug(card.id),
      caption: card.caption,
      href: card.href,
      tone: card.tone,
      image: await image(card.image),
      order: order(index),
    });
  }

  console.log('Inspirations and reflection prompts');
  inspirations.forEach((item, index) =>
    docs.push({
      _id: `inspiration-${item.id}`,
      _type: 'inspiration',
      key: item.id,
      text: item.text,
      tags: item.tags,
      order: order(index),
    }),
  );
  reflectionPrompts.forEach((item, index) =>
    docs.push({
      _id: `reflectionPrompt-${item.id}`,
      _type: 'reflectionPrompt',
      key: item.id,
      question: item.question,
      order: order(index),
    }),
  );

  console.log('Home screen');
  const recommendedItems = [];
  for (const item of recommended) {
    // Only the purpose-made card artwork is stored; otherwise the session's own is used.
    const own = item.image === item.meditation.image;
    recommendedItems.push({
      _type: 'recommendedItem',
      meditation: ref(meditationDocId(item.meditation.id)),
      collection: item.collection,
      ...(own ? {} : { image: await image(item.image) }),
    });
  }
  docs.push({
    _id: 'homePage',
    _type: 'homePage',
    recommended: keyed(recommendedItems),
    today: keyed(
      todaysPicks.map((pick) => ({
        _type: 'todayItem',
        meditation: ref(meditationDocId(pick.meditation.id)),
        rating: pick.rating,
      })),
    ),
  });

  return docs;
}

async function main() {
  console.log(`Importing into ${PROJECT_ID}/${DATASET}\n`);
  const docs = await buildDocuments();

  // Small batches keep each transaction well under the API's size limit.
  for (let start = 0; start < docs.length; start += 40) {
    const transaction = client.transaction();
    for (const doc of docs.slice(start, start + 40)) {
      transaction.createOrReplace(doc as { _id: string; _type: string });
    }
    await transaction.commit({ visibility: 'async' });
  }

  const counts = docs.reduce<Record<string, number>>((tally, doc) => {
    const type = String(doc._type);
    tally[type] = (tally[type] ?? 0) + 1;
    return tally;
  }, {});
  console.log(`\nDone: ${docs.length} documents, ${uploaded.size} files.`);
  console.table(counts);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
