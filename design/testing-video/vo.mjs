/**
 * Voice-over for the "Serenity is ready for internal testing" explainer,
 * recorded with Kokoro (open source, Apache-2.0) via kokoro-js, one warm
 * female voice throughout.
 *
 * Run from the project root:  node design/testing-video/vo.mjs
 * Writes one WAV per line to design/testing-video/build/vo/ plus lines.json.
 * `say` is what Kokoro reads when the written form would be misread.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { KokoroTTS } from 'kokoro-js';

const OUT = path.join(process.cwd(), 'design/testing-video/build/vo');
const VOICE = process.env.VOICE ?? 'af_heart';
const SPEED = Number(process.env.SPEED ?? 1.0);

export const LINES = [
  { id: 'welcome', text: 'Hello, everyone! Serenity, our meditation and wellbeing app, is now open for internal testing at Getmeds Incorporated and 2MG Incorporated.', say: 'Hello, everyone! Serenity, our meditation and wellbeing app, is now open for internal testing, at Get Meds Incorporated, and two M G Incorporated.' },
  { id: 'benefits', text: "It helps you manage stress, sleep better, and build healthier routines. And during testing, it's completely free." },
  { id: 'install', text: 'To install it, open the link in this announcement. On Android, download and install the app. On iPhone, open it in Safari and add Serenity to your Home Screen.' },
  { id: 'meditate', text: "Inside, you'll find guided meditations, programs, and a meditation timer," },
  { id: 'breathe', text: 'breathing exercises like box breathing and four-seven-eight,' },
  { id: 'sleep', text: 'sleep stories, ambient sounds, and a sleep timer,' },
  { id: 'yoga', text: 'and gentle, voice-guided yoga.' },
  { id: 'kapwa', text: 'Talk to Kapwa, your wellness companion, in English, Filipino, or Hindi. Filipino and Hindi are still in beta.' },
  { id: 'track', text: 'Track your mood, your goals, and a gentle streak, and see your monthly insights. Plus reflections, favorites, sound mixes, offline downloads, and reminders.' },
  { id: 'test', text: "Please test everything: the features, the design, the speed, the content, Kapwa's replies, and how it runs on your phone." },
  { id: 'feedback', text: 'To send feedback, go to Profile, Help and Support, then Raise a Concern. Describe it, attach up to three screenshots, and submit.' },
  { id: 'shots', text: 'Keep screenshots original and full-screen, and leave out passwords or private details.' },
  { id: 'it', text: 'The IT Department reviews every message, and will reply right in the app.', say: 'The I.T. Department reviews every message, and will reply right in the app.' },
  { id: 'close', text: "No experience needed. Explore at your own pace, and tell us honestly what you think. Let's make Serenity better, together!" },
];

function wav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}
function trim(s, rate) {
  let a = 0, b = s.length - 1;
  while (a < b && Math.abs(s[a]) < 0.008) a++;
  while (b > a && Math.abs(s[b]) < 0.008) b--;
  return s.slice(Math.max(0, a - Math.round(rate * 0.02)), Math.min(s.length, b + Math.round(rate * 0.08)));
}

mkdirSync(OUT, { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const meta = [];
for (const line of LINES) {
  const audio = await tts.generate(line.say ?? line.text, { voice: VOICE, speed: SPEED });
  const s = trim(audio.audio, audio.sampling_rate);
  writeFileSync(path.join(OUT, `${line.id}.wav`), wav(s, audio.sampling_rate));
  const duration = s.length / audio.sampling_rate;
  meta.push({ id: line.id, text: line.text, duration: Math.round(duration * 1000) / 1000, rate: audio.sampling_rate });
  console.log(`${line.id.padEnd(9)} ${duration.toFixed(2)}s  ${line.text}`);
}
writeFileSync(path.join(OUT, 'lines.json'), JSON.stringify({ voice: VOICE, speed: SPEED, lines: meta }, null, 2));
