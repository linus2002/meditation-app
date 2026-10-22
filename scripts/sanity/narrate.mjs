/**
 * Records each story's narration with Kokoro (an open-source, Apache-2.0 text
 * to speech model) and attaches it to the story in Sanity.
 *
 * Run with: npm run content:narrate [-- --only lighthouse,night-ferry] [-- --force]
 *
 * Runs entirely on this machine; the model (~300 MB) downloads once into
 * node_modules. Each story is read paragraph by paragraph with a pause between,
 * and the time each paragraph starts is stored beside the audio so the app can
 * follow along in the text. A story is only re-recorded when its text, its
 * narrator or the settings below change, so after editing one story in the
 * Studio, re-running this records just that one. Then `npm run content:pull`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Mp3Encoder } from '@breezystack/lamejs';
import { createClient } from '@sanity/client';
import { KokoroTTS } from 'kokoro-js';

const PROJECT_ID = 'jn0rojao';
const DATASET = 'production';
const ROOT = process.cwd();

/** One Kokoro voice per narrator, so a name always sounds like the same person. */
const VOICES = {
  'Ava Lindqvist': 'bf_emma',
  'Ines Moreau': 'bf_isabella',
  'Noah Brandt': 'am_michael',
};
const FALLBACK_VOICE = 'bf_emma';

/** Slower than conversation: these are read to people winding down. */
const SPEED = 0.85;
const LEAD_IN_SECONDS = 0.8;
const PARAGRAPH_PAUSE_SECONDS = 1.4;
const TAIL_SECONDS = 2.5;
/** Every story is levelled to the same loudness, whichever voice reads it. */
const TARGET_RMS = 0.1;
const BITRATE_KBPS = 80;

const SETTINGS = { model: 'Kokoro-82M-v1.0', SPEED, LEAD_IN_SECONDS, PARAGRAPH_PAUSE_SECONDS, TAIL_SECONDS, TARGET_RMS, BITRATE_KBPS };

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const onlyIndex = args.indexOf('--only');
const ONLY = onlyIndex >= 0 ? new Set(args[onlyIndex + 1]?.split(',')) : null;

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

const voiceFor = (narrator) => VOICES[narrator] ?? FALLBACK_VOICE;

const fingerprint = (story) =>
  createHash('sha1')
    .update(JSON.stringify({ paragraphs: story.paragraphs, voice: voiceFor(story.voice), SETTINGS }))
    .digest('hex');

function silence(seconds, rate) {
  return new Float32Array(Math.round(seconds * rate));
}

function concat(parts) {
  const out = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Brings the speech to a common loudness without letting any peak clip. */
function level(samples) {
  let sum = 0;
  let peak = 0;
  for (const value of samples) {
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(sum / samples.length) || 1;
  const gain = Math.min(TARGET_RMS / rms, 0.97 / (peak || 1));
  return samples.map((value) => value * gain);
}

function mp3(samples, rate) {
  const encoder = new Mp3Encoder(1, rate, BITRATE_KBPS);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    chunks.push(Buffer.from(encoder.encodeBuffer(pcm.subarray(i, i + 1152))));
  }
  chunks.push(Buffer.from(encoder.flush()));
  return Buffer.concat(chunks);
}

async function record(tts, story) {
  const voice = voiceFor(story.voice);
  let rate = 24000;
  const parts = [];
  const paragraphStarts = [];
  let length = 0;

  const push = (part) => {
    parts.push(part);
    length += part.length;
  };

  push(silence(LEAD_IN_SECONDS, rate));
  for (const [index, paragraph] of story.paragraphs.entries()) {
    const audio = await tts.generate(paragraph, { voice, speed: SPEED });
    rate = audio.sampling_rate;
    if (index > 0) push(silence(PARAGRAPH_PAUSE_SECONDS, rate));
    paragraphStarts.push(Math.round((length / rate) * 100) / 100);
    push(audio.audio);
  }
  push(silence(TAIL_SECONDS, rate));

  const samples = level(concat(parts));
  return {
    buffer: mp3(samples, rate),
    duration: Math.round((samples.length / rate) * 10) / 10,
    paragraphStarts,
    voice,
  };
}

async function main() {
  const stories = await client.fetch(
    `*[_type == "story" && !(_id in path("drafts.**"))] | order(order asc) {
      _id, "id": slug.current, title, voice, paragraphs, "hash": narration.hash
    }`,
  );
  const todo = stories.filter(
    (story) => (!ONLY || ONLY.has(story.id)) && (FORCE || story.hash !== fingerprint(story)),
  );
  if (todo.length === 0) {
    console.log('narrate: every story is already up to date.');
    return;
  }

  console.log(`narrate: recording ${todo.length} of ${stories.length} stories`);
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'fp32',
    device: 'cpu',
  });

  for (const story of todo) {
    const started = Date.now();
    const { buffer, duration, paragraphStarts, voice } = await record(tts, story);
    const asset = await client.assets.upload('file', buffer, {
      filename: `${story.id}.mp3`,
      contentType: 'audio/mpeg',
    });
    await client
      .patch(story._id)
      .set({
        narration: {
          _type: 'storyNarration',
          audio: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
          duration,
          paragraphStarts,
          voice,
          hash: fingerprint(story),
        },
      })
      .commit();
    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(
      `  ${story.title}: ${voice}, ${Math.floor(duration / 60)}m${Math.round(duration % 60)}s, ${Math.round(buffer.length / 1024)} KB (${seconds}s)`,
    );
  }
  console.log('narrate: done. Run npm run content:pull to bring the audio into the app.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
