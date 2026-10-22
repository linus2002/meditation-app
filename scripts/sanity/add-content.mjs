/**
 * Adds the content in scripts/sanity/new-content/*.json to Sanity: library
 * meditations, programmes (with their own sessions), stories and yoga.
 *
 * Run with: node scripts/sanity/add-content.mjs [--dry-run]
 *
 * Each item gets a generated placeholder cover (a soft abstract gradient, no
 * text), to be swapped for real artwork in the Studio. Safe to run again:
 * documents have fixed ids and identical images are de-duplicated by Sanity.
 * Also ticks "Featured on home" on the programmes that were already there, so
 * the home rail keeps showing exactly those. `--dry-run` only writes the covers
 * to .content-preview/ for a look, and touches nothing in Sanity.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createClient } from '@sanity/client';
import sharp from 'sharp';

const PROJECT_ID = 'jn0rojao';
const DATASET = 'production';
const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'scripts/sanity/new-content');
const DRY_RUN = process.argv.includes('--dry-run');

const read = (name) => JSON.parse(readFileSync(path.join(SOURCE, `${name}.json`), 'utf8'));

/** Reads one value from .env.local without printing anything. */
function envValue(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(ROOT, '.env.local');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') || undefined;
}

/* ------------------------------------------------------------------ *
 * Placeholder covers
 * ------------------------------------------------------------------ */

/** Deep enough that white type stays readable over every one of them. */
const PALETTES = {
  focus: { name: 'deep blue', colors: ['#0d2340', '#1f5f8b', '#8cc0e0'] },
  sleep: { name: 'midnight indigo', colors: ['#0a0e2c', '#2a2f6b', '#7275c2'] },
  anxiety: { name: 'sea green', colors: ['#10302f', '#2f6f6a', '#9fd3c7'] },
  happiness: { name: 'warm rose and amber', colors: ['#3e1a28', '#b35a54', '#f2b880'] },
  relaxation: { name: 'soft green', colors: ['#112a1c', '#3f7a55', '#b0dba8'] },
  breathing: { name: 'pale teal', colors: ['#0e2635', '#2b7a9b', '#b5e3f0'] },
  mindfulness: { name: 'dusky violet', colors: ['#221c38', '#7a5c9e', '#e0c3e8'] },
  earth: { name: 'earthy terracotta', colors: ['#2e1a12', '#a0603e', '#f0c9a0'] },
  dawn: { name: 'dawn peach', colors: ['#2a1b33', '#c26d6d', '#ffd3a8'] },
};

/** A small, repeatable pseudo-random sequence per item, so a re-run is byte-identical. */
function seeded(text) {
  let state = createHash('sha1').update(text).digest().readUInt32LE(0);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

async function cover(id, paletteKey) {
  const { colors } = PALETTES[paletteKey];
  const [dark, mid, light] = colors;
  const random = seeded(id);
  const size = 900;
  const angle = Math.round(random() * 360);
  const orbs = Array.from({ length: 4 }, (_, index) => {
    const r = 160 + random() * 260;
    const x = random() * size;
    const y = random() * size;
    const fill = index % 2 === 0 ? light : mid;
    const opacity = (0.25 + random() * 0.35).toFixed(2);
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${fill}" opacity="${opacity}" filter="url(#blur)"/>`;
  }).join('');
  const waveY = 560 + random() * 180;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)">
        <stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${mid}"/>
      </linearGradient>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="90"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    ${orbs}
    <path d="M-80 ${waveY.toFixed(0)} C ${size * 0.3} ${(waveY - 90).toFixed(0)}, ${size * 0.6} ${(waveY + 90).toFixed(0)}, ${size + 80} ${(waveY - 30).toFixed(0)} L ${size + 80} ${size + 80} L -80 ${size + 80} Z" fill="${dark}" opacity="0.45" filter="url(#soft)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

const coverAlt = (paletteKey) => `Abstract ${PALETTES[paletteKey].name} gradient with soft glowing light`;

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

const BREATH = {
  box: [
    { label: 'Breathe in', seconds: 4 },
    { label: 'Hold', seconds: 4 },
    { label: 'Breathe out', seconds: 4 },
    { label: 'Hold', seconds: 4 },
  ],
  coherent: [
    { label: 'Breathe in', seconds: 5 },
    { label: 'Breathe out', seconds: 5 },
  ],
  478: [
    { label: 'Breathe in', seconds: 4 },
    { label: 'Hold', seconds: 7 },
    { label: 'Breathe out', seconds: 8 },
  ],
};

/** The card colour treatment each mood already uses in the app. */
const TONE = {
  focus: 'activities',
  breathing: 'activities',
  happiness: 'happiness',
  anxiety: 'happiness',
  relaxation: 'relaxation',
  sleep: 'relaxation',
};

const YOGA_PALETTES = ['earth', 'dawn', 'relaxation', 'breathing', 'mindfulness'];
const PROGRAM_PALETTES = ['anxiety', 'focus', 'happiness', 'dawn', 'relaxation', 'sleep'];

const slug = (current) => ({ _type: 'slug', current });
const ref = (id) => ({ _type: 'reference', _ref: id });
const keyed = (items) => items.map((item, index) => ({ _key: `k${index}`, ...item }));

const client = DRY_RUN
  ? null
  : createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: '2024-01-01',
      token: envValue('SANITY_API_WRITE_TOKEN'),
      useCdn: false,
    });

const PREVIEW_DIR = path.join(ROOT, '.content-preview');

async function image(id, paletteKey) {
  const buffer = await cover(id, paletteKey);
  if (DRY_RUN) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    writeFileSync(path.join(PREVIEW_DIR, `${id}.jpg`), buffer);
    return { _type: 'image', asset: ref('dry-run') };
  }
  const asset = await client.assets.upload('image', buffer, { filename: `${id}.jpg` });
  return { _type: 'image', asset: ref(asset._id) };
}

function meditationDoc(item, { narrator, inLibrary, order, image: img, paletteKey }) {
  return {
    _id: `meditation-${item.id}`,
    _type: 'meditation',
    title: item.title,
    slug: slug(item.id),
    inLibrary,
    subtitle: item.subtitle,
    narrator,
    category: item.category,
    durationMinutes: item.durationMinutes,
    tone: TONE[item.category],
    image: img,
    imageAlt: coverAlt(paletteKey),
    soundscape: item.soundscape,
    description: item.description,
    breathPattern: keyed(BREATH[item.breath].map((phase) => ({ _type: 'breathPhase', ...phase }))),
    isSleep: Boolean(item.isSleep),
    isDailyGoal: false,
    order,
  };
}

async function maxOrders() {
  if (DRY_RUN) return {};
  const result = await client.fetch(
    `{ "meditation": math::max(*[_type == "meditation"].order), "program": math::max(*[_type == "program"].order),
       "story": math::max(*[_type == "story"].order), "yogaSession": math::max(*[_type == "yogaSession"].order) }`,
  );
  return result ?? {};
}

async function main() {
  if (!DRY_RUN && !envValue('SANITY_API_WRITE_TOKEN')) {
    console.error('SANITY_API_WRITE_TOKEN is missing from .env.local.');
    process.exit(1);
  }
  console.log(DRY_RUN ? 'Dry run: covers only\n' : `Adding to ${PROJECT_ID}/${DATASET}\n`);

  const start = await maxOrders();
  const next = (type) => {
    start[type] = (start[type] ?? 0) + 10;
    return start[type];
  };
  const docs = [];

  console.log('Meditations');
  for (const item of read('meditations')) {
    const paletteKey = item.category;
    docs.push(
      meditationDoc(item, {
        narrator: item.narrator,
        inLibrary: true,
        order: next('meditation'),
        image: await image(item.id, paletteKey),
        paletteKey,
      }),
    );
  }

  console.log('Programmes');
  for (const [index, program] of read('programs').entries()) {
    const paletteKey = PROGRAM_PALETTES[index % PROGRAM_PALETTES.length];
    for (const session of program.sessions) {
      docs.push(
        meditationDoc(session, {
          narrator: program.author,
          inLibrary: false,
          order: next('meditation'),
          image: await image(session.id, session.category),
          paletteKey: session.category,
        }),
      );
    }
    docs.push({
      _id: `program-${program.id}`,
      _type: 'program',
      title: program.title,
      slug: slug(program.id),
      author: program.author,
      level: program.level,
      description: program.description,
      sessions: keyed(program.sessions.map((session) => ref(`meditation-${session.id}`))),
      image: await image(program.id, paletteKey),
      scrim: program.scrim,
      featured: false,
      order: next('program'),
    });
  }

  console.log('Stories');
  for (const story of read('stories')) {
    const paletteKey = story.category;
    docs.push({
      _id: `story-${story.id}`,
      _type: 'story',
      title: story.title,
      slug: slug(story.id),
      description: story.description,
      category: story.category,
      voice: story.voice,
      image: await image(story.id, paletteKey),
      imageAlt: coverAlt(paletteKey),
      soundscape: story.soundscape,
      paragraphs: story.paragraphs,
      order: next('story'),
    });
  }

  console.log('Yoga');
  for (const [index, session] of read('yoga').entries()) {
    const paletteKey = YOGA_PALETTES[index % YOGA_PALETTES.length];
    docs.push({
      _id: `yoga-${session.id}`,
      _type: 'yogaSession',
      title: session.title,
      slug: slug(session.id),
      subtitle: session.subtitle,
      focus: session.focus,
      level: session.level,
      image: await image(session.id, paletteKey),
      imageAlt: coverAlt(paletteKey),
      soundscape: session.soundscape,
      description: session.description,
      poses: keyed(session.poses.map((pose) => ({ _type: 'pose', ...pose }))),
      order: next('yogaSession'),
    });
  }

  if (DRY_RUN) {
    console.log(`\nWrote ${docs.length} covers to ${PREVIEW_DIR}`);
    return;
  }

  // The programmes already there stay on the home screen; the new ones do not.
  const newProgramIds = new Set(docs.filter((doc) => doc._type === 'program').map((doc) => doc._id));
  const existing = await client.fetch(`*[_type == "program" && !(_id in path("drafts.**"))]._id`);
  const featured = existing.filter((id) => !newProgramIds.has(id));

  for (let from = 0; from < docs.length; from += 40) {
    const transaction = client.transaction();
    for (const doc of docs.slice(from, from + 40)) transaction.createOrReplace(doc);
    await transaction.commit({ visibility: 'async' });
  }
  const patch = client.transaction();
  for (const id of featured) patch.patch(id, { set: { featured: true } });
  await patch.commit({ visibility: 'async' });

  const counts = docs.reduce((tally, doc) => ({ ...tally, [doc._type]: (tally[doc._type] ?? 0) + 1 }), {});
  console.log(`\nDone: ${docs.length} documents written; featured on home: ${featured.join(', ')}`);
  console.table(counts);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
