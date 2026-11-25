/**
 * Voice-over for the landscape Serenity promo, recorded with Kokoro (open-source,
 * Apache-2.0) through kokoro-js — the same model the app's story narration
 * uses, already cached in node_modules.
 *
 * Run from the project root:  node design/promo-video-landscape/vo.mjs
 * Writes one mono WAV per line to design/promo-video-landscape/build/vo/ plus
 * lines.json with each clip's duration, which the timeline reads.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { KokoroTTS } from 'kokoro-js';

const OUT = path.join(process.cwd(), 'design/promo-video-landscape/build/vo');
const VOICE = process.env.VOICE ?? 'af_heart';
const SPEED = Number(process.env.SPEED ?? 1.0);

/** One warm female voice reads every line. */
const A = 'af_heart';
const B = A;
export const LINES = [
  { id: 'l1', voice: A, text: 'Every calm moment you need, already in your pocket.' },
  { id: 'l2', voice: B, text: 'One tap, and breathe.' },
  { id: 'l3', voice: A, text: 'Guided sits, sleep stories, soft rain.' },
  { id: 'l4', voice: B, text: 'Fresh sessions for every part of your day.' },
  { id: 'l5', voice: A, text: 'Find your calm, wherever you are.' },
  { id: 'l6', voice: B, text: 'With a single breath.' },
];

function wav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/** Trim the model's leading/trailing near-silence so clips land exactly on cue. */
function trim(samples, rate) {
  const thr = 0.008;
  let a = 0;
  let b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  a = Math.max(0, a - Math.round(rate * 0.02));
  b = Math.min(samples.length, b + Math.round(rate * 0.08));
  return samples.slice(a, b);
}

mkdirSync(OUT, { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const meta = [];
for (const line of LINES) {
  const audio = await tts.generate(line.text, { voice: line.voice ?? VOICE, speed: SPEED });
  const s = trim(audio.audio, audio.sampling_rate);
  writeFileSync(path.join(OUT, `${line.id}.wav`), wav(s, audio.sampling_rate));
  const duration = s.length / audio.sampling_rate;
  meta.push({ ...line, duration: Math.round(duration * 1000) / 1000, rate: audio.sampling_rate });
  console.log(`${line.id.padEnd(8)} ${duration.toFixed(2)}s  ${line.text}`);
}
writeFileSync(path.join(OUT, 'lines.json'), JSON.stringify({ voice: VOICE, speed: SPEED, lines: meta }, null, 2));
