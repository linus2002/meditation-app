/**
 * Uploads each session's guided recording to Sanity and attaches it
 * to the session's `recording` field, so the audio streams from Sanity's CDN
 * instead of shipping inside the app.
 *
 * Run with: npm run content:recordings [-- --only six-phase-connection,...] [-- --force]
 * Then `npm run content:pull` to bring the URLs into the app.
 *
 * The files are read from RECORDINGS_DIR (default: public/), one folder per
 * programme (library sessions sit in meditations/), as listed below. A file
 * that isn't an MP3 (an .m4a, say) is converted to MP3 with ffmpeg first, so
 * every phone, iPhones included, can play it; the length is measured from the
 * file that is uploaded. Each upload stores the file's SHA-1, so a re-run
 * skips sessions whose file has not changed; put a replacement file in place
 * and re-run to swap one. A session missing its file locally is skipped with a
 * note, which is what lets this run after the local folders have been removed.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createClient } from '@sanity/client';

const PROJECT_ID = 'jn0rojao';
const DATASET = 'production';
const ROOT = process.cwd();

/** Session id → [programme folder, file name]. */
const RECORDINGS = {
  'meditation-daily': ['meditations', 'Settle and Soften.m4a'],
  'free-your-mind': ['meditations', 'Free Your Mind.m4a'],
  'morning-clarity': ['meditations', 'Morning Clarity.m4a'],
  'open-heart': ['meditations', 'Open Heart.m4a'],
  'box-breathing': ['meditations', 'Box Breathing.m4a'],
  'deep-rest': ['meditations', 'Deep Rest.m4a'],
  'night-wind-down': ['meditations', 'Night Wind Down.m4a'],
  'rain-on-glass': ['meditations', 'Rain on Glass.m4a'],
  'midday-reset': ['meditations', 'Midday Reset.m4a'],
  'mindful-walk': ['meditations', 'Mindful Walk.m4a'],
  'deep-focus': ['meditations', 'Deep Focus.m4a'],
  'coherent-breathing': ['meditations', 'Cohearant Breathing.m4a'],
  'relaxing-breath': ['meditations', 'The Relaxing Breathe.m4a'],
  'sleepy-body-scan': ['meditations', 'Sleep Body Scan.m4a'],
  'panic-pause': ['meditations', 'Panic Pause.mp3'],

  'six-phase-connection': ['the-six-phase', '01 - Connection.mp3'],
  'six-phase-gratitude': ['the-six-phase', '02 - Gratitude.mp3'],
  'six-phase-forgiveness': ['the-six-phase', '03 - Forgiveness.mp3'],
  'six-phase-future-dream': ['the-six-phase', '04 - Future Dream.mp3'],
  'six-phase-perfect-day': ['the-six-phase', '05 - The Perfect Day.mp3'],
  'six-phase-blessing': ['the-six-phase', '06 - The Blessing.mp3'],

  'sleep-mastery-unclench': ['sleep-mastery', '01 - Unclench the Day.mp3'],
  'sleep-mastery-heavy-body': ['sleep-mastery', '02 - The Heavy Body.mp3'],
  'sleep-mastery-counting-down': ['sleep-mastery', '03 - Counting Down.mp3'],
  'sleep-mastery-worry-parking': ['sleep-mastery', '04 - Worry Parking.mp3'],
  'sleep-mastery-night-breath': ['sleep-mastery', '05 - Breath of the Night.mp3'],
  'sleep-mastery-long-exhale': ['sleep-mastery', '06 - The Long Exhale.mp3'],
  'sleep-mastery-drifting-off': ['sleep-mastery', '07 - Drifting Off.mp3'],

  'steady-mind-name-it': ['a-steady-mind', '01 - Name What Is Here.mp3'],
  'steady-mind-anchor': ['a-steady-mind', '02 - Anchor in the Feet.mp3'],
  'steady-mind-wave': ['a-steady-mind', '03 - Riding the Wave.mp3'],
  'steady-mind-observer': ['a-steady-mind', '04 - The Calm Observer.mp3'],
  'steady-mind-steady-ground': ['a-steady-mind', '05 - Steady Ground.mp3'],

  'open-water-shoreline': ['open-water', '01 - Shoreline.mp3'],
  'open-water-tidepool': ['open-water', '02 - Tidepool.mp3'],
  'open-water-open-sea': ['open-water', '03 - Open Sea.mp3'],
  'open-water-return': ['open-water', '04 - Return to Shore.mp3'],

  'calm-foundations-arrive': ['calm-foundations', '01 - Arriving.mp3'],
  'calm-foundations-breath': ['calm-foundations', '02 - The Breath.mp3'],
  'calm-foundations-body': ['calm-foundations', '03 - The Body.mp3'],
  'calm-foundations-thoughts': ['calm-foundations', '04 - Thoughts.mp3'],
  'calm-foundations-everyday': ['calm-foundations', '05 - Everyday Calm.mp3'],

  'kind-to-yourself-hand-on-heart': ['kind-to-yourself', '01 - Hand on Heart.mp3'],
  'kind-to-yourself-inner-voice': ['kind-to-yourself', '02 - The Inner Voice.mp3'],
  'kind-to-yourself-common-ground': ['kind-to-yourself', '03 - Common Ground.mp3'],
  'kind-to-yourself-what-you-need': ['kind-to-yourself', '04 - What Do You Need.mp3'],
  'kind-to-yourself-warm-wishes': ['kind-to-yourself', '05 - Warm Wishes.mp3'],

  'better-mornings-waking': ['better-mornings', '01 - Waking Slowly.mp3'],
  'better-mornings-intention': ['better-mornings', '02 - One Intention.mp3'],
  'better-mornings-energy': ['better-mornings', '03 - Energising Breath.mp3'],
  'better-mornings-gratitude': ['better-mornings', '04 - Morning Gratitude.mp3'],
  'better-mornings-step-out': ['better-mornings', '05 - Stepping Out.mp3'],

  'breath-school-natural': ['breath-school', '01 - The Natural Breath.mp3'],
  'breath-school-belly': ['breath-school', '02 - Belly Breathing.mp3'],
  'breath-school-box': ['breath-school', '03 - Box Breathing.mp3'],
  'breath-school-coherent': ['breath-school', '04 - Coherent Breathing.mp3'],
  'breath-school-four-seven-eight': ['breath-school', '05 - Breathing for Sleep.mp3'],

  'focus-reset-single-point': ['focus-reset', '01 - Single Point.mp3'],
  'focus-reset-wandering': ['focus-reset', '02 - The Wandering Mind.mp3'],
  'focus-reset-before-work': ['focus-reset', '03 - Before Deep Work.mp3'],
  'focus-reset-long-hold': ['focus-reset', '04 - The Long Hold.mp3'],
  'focus-reset-close': ['focus-reset', '05 - Closing the Day.mp3'],
};

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const onlyIndex = args.indexOf('--only');
const ONLY = onlyIndex >= 0 ? new Set(args[onlyIndex + 1]?.split(',')) : null;
const SOURCE_DIR = path.resolve(ROOT, process.env.RECORDINGS_DIR ?? 'public');

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

const token = envValue('SANITY_API_WRITE_TOKEN');
if (!token) {
  console.error('SANITY_API_WRITE_TOKEN is missing from .env.local.');
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

/** Length in seconds, measured from the file with ffprobe. */
function measure(file) {
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' },
    );
    const seconds = Number.parseFloat(out.trim());
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`unreadable length "${out.trim()}"`);
    return Math.round(seconds * 1000) / 1000;
  } catch (error) {
    throw new Error(`could not measure ${path.basename(file)} with ffprobe (${error.message})`);
  }
}

/**
 * The MP3 to upload: the file itself, or an MP3 converted from it. Cover art
 * embedded in the file is dropped; the session's artwork comes from Sanity.
 */
function toMp3(file, workDir) {
  if (path.extname(file).toLowerCase() === '.mp3') return file;
  const out = path.join(workDir, `${path.basename(file, path.extname(file))}.mp3`);
  try {
    execFileSync(
      'ffmpeg',
      ['-v', 'error', '-y', '-i', file, '-vn', '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '128k', out],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
  } catch (error) {
    throw new Error(`could not convert ${path.basename(file)} to MP3 with ffmpeg (${error.message})`);
  }
  return out;
}

/** Retries a call through Sanity's occasional 5xx and dropped connections. */
async function withRetry(label, call, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const status = error.statusCode ?? error.response?.statusCode;
      const transient = !status || status >= 500 || status === 429;
      if (!transient || attempt >= attempts) throw error;
      const wait = 2000 * 2 ** (attempt - 1);
      console.warn(`${label}: ${error.message}; retrying in ${wait / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

async function main() {
  const ids = Object.keys(RECORDINGS).filter((id) => !ONLY || ONLY.has(id));
  const docs = await client.fetch(
    `*[_type == "meditation" && slug.current in $ids && !(_id in path("drafts.**"))]{ _id, "id": slug.current, "hash": recording.hash }`,
    { ids },
  );
  const byId = new Map(docs.map((doc) => [doc.id, doc]));

  let uploaded = 0;
  let unchanged = 0;
  const problems = [];
  const workDir = mkdtempSync(path.join(os.tmpdir(), 'serenity-recordings-'));

  for (const [index, id] of ids.entries()) {
    const [folder, name] = RECORDINGS[id];
    const label = `[${index + 1}/${ids.length}] ${id}`;
    const doc = byId.get(id);
    if (!doc) {
      problems.push(`${id}: no published meditation with this id in Sanity`);
      console.warn(`${label}: no meditation in Sanity, skipped`);
      continue;
    }

    const file = path.join(SOURCE_DIR, folder, name);
    if (!existsSync(file)) {
      if (doc.hash) {
        unchanged += 1;
        console.log(`${label}: already in Sanity (no local file)`);
      } else {
        problems.push(`${id}: ${folder}/${name} not found and nothing in Sanity yet`);
        console.warn(`${label}: file missing, skipped`);
      }
      continue;
    }

    const buffer = readFileSync(file);
    const hash = createHash('sha1').update(buffer).digest('hex');
    if (!FORCE && doc.hash === hash) {
      unchanged += 1;
      console.log(`${label}: unchanged`);
      continue;
    }

    const mp3 = toMp3(file, workDir);
    const upload = mp3 === file ? buffer : readFileSync(mp3);
    const duration = measure(mp3);
    // Sanity names assets by their content, so a retried upload reuses the same asset.
    const asset = await withRetry(label, () =>
      client.assets.upload('file', upload, { filename: `${id}.mp3`, contentType: 'audio/mpeg' }),
    );
    await withRetry(label, () =>
      client
        .patch(doc._id)
        .set({
          recording: {
            _type: 'object',
            audio: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
            duration,
            hash,
          },
        })
        .commit(),
    );
    uploaded += 1;
    console.log(`${label}: uploaded (${(upload.length / 1048576).toFixed(1)} MB, ${Math.round(duration)}s)`);
  }

  rmSync(workDir, { recursive: true, force: true });
  console.log(`\nrecordings: ${uploaded} uploaded, ${unchanged} already in Sanity, ${problems.length} problems`);
  if (problems.length) {
    for (const problem of problems) console.warn(`  - ${problem}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`recordings: ${error.message}`);
  process.exit(1);
});
