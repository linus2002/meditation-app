/**
 * Composes the background music played under story narration, from scratch:
 * nothing sampled or licensed, so it is the app's own to ship.
 *
 * Run with: npm run music:compose
 *
 * Writes one seamlessly looping track per story mood into public/audio/music/.
 * Each is soft sustained chords (detuned, filtered, gently moving) with slow,
 * sparse notes over the top, through a small room reverb. The note choices are
 * seeded, so a re-run produces the same files.
 *
 * Looping: everything is scheduled on a cycle of exactly LOOP seconds, two
 * cycles are rendered, and only the second is kept. Its opening already holds
 * the tails of the first cycle's closing notes and reverb, which is exactly
 * what follows the end of the track when it loops, so there is no seam.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Mp3Encoder } from '@breezystack/lamejs';

const RATE = 44100;
const OUT_DIR = path.join(process.cwd(), 'public/audio/music');
/** Quiet in the file itself; the player sets the final level under the voice. */
const TARGET_RMS = 0.05;
const BITRATE_KBPS = 112;

const midi = (note) => 440 * 2 ** ((note - 69) / 12);

const TRACKS = [
  {
    id: 'sleep',
    chordSeconds: 14,
    // Dmaj9, Bm9, Gmaj9, Asus: low and close, nothing that rises.
    chords: [
      { bass: 38, notes: [54, 57, 61, 64] },
      { bass: 47, notes: [54, 57, 61, 62] },
      { bass: 43, notes: [54, 57, 59, 62] },
      { bass: 45, notes: [52, 57, 59, 62] },
    ],
    scale: [62, 64, 66, 69, 71, 74, 76],
    noteEvery: 7,
    noteDecay: 3.6,
    bell: false,
    cutoff: 850,
    noteLevel: 0.11,
  },
  {
    id: 'relaxation',
    chordSeconds: 11,
    // Fmaj9, Dm9, Bbmaj9, C6/9: warm and open.
    chords: [
      { bass: 41, notes: [57, 60, 64, 67] },
      { bass: 38, notes: [53, 57, 60, 64] },
      { bass: 46, notes: [57, 60, 62, 65] },
      { bass: 48, notes: [55, 57, 62, 64] },
    ],
    scale: [65, 67, 69, 72, 74, 77, 79],
    noteEvery: 4,
    noteDecay: 2.8,
    bell: false,
    cutoff: 1300,
    noteLevel: 0.12,
  },
  {
    id: 'mindfulness',
    chordSeconds: 10,
    // Amaj9, F#m11, Dmaj7#11, Esus: a little brighter, with bells.
    chords: [
      { bass: 45, notes: [61, 64, 68, 71] },
      { bass: 42, notes: [57, 61, 64, 68] },
      { bass: 38, notes: [54, 57, 61, 68] },
      { bass: 40, notes: [59, 64, 69, 71] },
    ],
    scale: [69, 71, 73, 76, 78, 81, 83],
    noteEvery: 3.5,
    noteDecay: 4.5,
    bell: true,
    cutoff: 1900,
    noteLevel: 0.09,
  },
];

/** A small repeatable random sequence, so a re-run is identical. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Raised-cosine fade in over `fade` seconds from `start`, out over `fade` ending at `end`. */
function window(t, start, end, fade) {
  if (t <= start || t >= end) return 0;
  const rise = Math.min(1, (t - start) / fade);
  const fall = Math.min(1, (end - t) / fade);
  const shape = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  return shape(rise) * shape(fall);
}

function renderPads(track, loop, length, left, right) {
  const { chords, chordSeconds } = track;
  const fade = chordSeconds * 0.45;
  // Two passes of the progression per cycle; three cycles of chords cover the
  // pre-roll, so the kept cycle starts with the previous chord still sounding.
  for (let cycle = -1; cycle <= 1; cycle++) {
    for (let pass = 0; pass < 2; pass++) {
      chords.forEach((chord, index) => {
        const start = cycle * loop + (pass * chords.length + index) * chordSeconds - fade / 2;
        const end = start + chordSeconds + fade;
        const from = Math.max(0, Math.floor(start * RATE));
        const to = Math.min(length, Math.ceil(end * RATE));
        const voices = [
          { freq: midi(chord.bass), gain: 0.16, pan: 0 },
          ...chord.notes.map((note, n) => ({ freq: midi(note), gain: 0.07, pan: n % 2 ? 0.35 : -0.35 })),
        ];
        for (const voice of voices) {
          // Three slightly detuned copies make the pad breathe rather than buzz.
          const detunes = [-0.0045, 0, 0.0045];
          for (let i = from; i < to; i++) {
            const t = i / RATE;
            const env = window(t, start, end, fade) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.07 * t + voice.freq));
            if (env === 0) continue;
            let sample = 0;
            for (const detune of detunes) {
              const phase = 2 * Math.PI * voice.freq * (1 + detune) * t;
              sample += Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase);
            }
            sample *= (voice.gain * env) / detunes.length;
            left[i] += sample * (1 - voice.pan) * 0.5;
            right[i] += sample * (1 + voice.pan) * 0.5;
          }
        }
      });
    }
  }
}

function lowpass(samples, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += a * (samples[i] - y);
    samples[i] = y;
  }
  // A second pass rounds the slope off, for a softer, darker pad.
  y = 0;
  for (let i = 0; i < samples.length; i++) {
    y += a * (samples[i] - y);
    samples[i] = y;
  }
}

function renderNotes(track, loop, length, left, right) {
  const random = seeded(track.id.length * 7919 + track.chordSeconds);
  const events = [];
  let at = 1.5;
  let step = Math.floor(track.scale.length / 2);
  while (at < loop - 1) {
    step = Math.min(track.scale.length - 1, Math.max(0, step + Math.round((random() - 0.5) * 3)));
    events.push({ at, note: track.scale[step], pan: (random() - 0.5) * 0.8, velocity: 0.6 + random() * 0.4 });
    at += track.noteEvery * (0.6 + random() * 0.8);
  }

  const partials = track.bell
    ? [
        [1, 1],
        [2.76, 0.28],
        [5.4, 0.09],
        [8.93, 0.03],
      ]
    : [
        [1, 1],
        [2, 0.35],
        [3, 0.12],
        [4.01, 0.05],
      ];
  const span = track.noteDecay * 5;

  for (let cycle = 0; cycle <= 1; cycle++) {
    for (const event of events) {
      const start = cycle * loop + event.at;
      const freq = midi(event.note);
      const from = Math.floor(start * RATE);
      const to = Math.min(length, Math.ceil((start + span) * RATE));
      for (let i = from; i < to; i++) {
        const t = (i - from) / RATE;
        const attack = Math.min(1, t / 0.012);
        let sample = 0;
        for (const [ratio, gain] of partials) {
          // Upper partials fade sooner, as a struck string or bell does.
          sample += gain * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp((-t * ratio ** 0.5) / track.noteDecay);
        }
        sample *= track.noteLevel * event.velocity * attack;
        left[i] += sample * (1 - event.pan) * 0.5;
        right[i] += sample * (1 + event.pan) * 0.5;
      }
    }
  }
}

/** A small Schroeder room: four damped combs into two all-passes. */
function reverb(input, offset) {
  const combs = [1557, 1617, 1491, 1422].map((delay) => ({
    buffer: new Float32Array(delay + offset),
    index: 0,
    store: 0,
  }));
  const allpasses = [556, 441].map((delay) => ({ buffer: new Float32Array(delay + offset), index: 0 }));
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let sum = 0;
    for (const comb of combs) {
      const value = comb.buffer[comb.index];
      comb.store = value * 0.8 + comb.store * 0.2;
      comb.buffer[comb.index] = input[i] * 0.015 + comb.store * 0.86;
      comb.index = (comb.index + 1) % comb.buffer.length;
      sum += value;
    }
    for (const allpass of allpasses) {
      const value = allpass.buffer[allpass.index];
      allpass.buffer[allpass.index] = sum + value * 0.5;
      allpass.index = (allpass.index + 1) % allpass.buffer.length;
      sum = value - sum;
    }
    out[i] = sum;
  }
  return out;
}

function encode(left, right) {
  const encoder = new Mp3Encoder(2, RATE, BITRATE_KBPS);
  const toPcm = (samples) => {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
    return pcm;
  };
  const l = toPcm(left);
  const r = toPcm(right);
  const chunks = [];
  for (let i = 0; i < l.length; i += 1152) {
    chunks.push(Buffer.from(encoder.encodeBuffer(l.subarray(i, i + 1152), r.subarray(i, i + 1152))));
  }
  chunks.push(Buffer.from(encoder.flush()));
  return Buffer.concat(chunks);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const track of TRACKS) {
  const loop = track.chordSeconds * track.chords.length * 2;
  const length = Math.round(loop * 2 * RATE);
  const left = new Float32Array(length);
  const right = new Float32Array(length);

  renderPads(track, loop, length, left, right);
  lowpass(left, track.cutoff);
  lowpass(right, track.cutoff);
  renderNotes(track, loop, length, left, right);

  // Slightly different room sizes per side give the reverb its width.
  const wetLeft = reverb(left, 0);
  const wetRight = reverb(right, 23);

  const keep = Math.round(loop * RATE);
  const from = length - keep;
  const outLeft = new Float32Array(keep);
  const outRight = new Float32Array(keep);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < keep; i++) {
    outLeft[i] = left[from + i] * 0.75 + wetLeft[from + i];
    outRight[i] = right[from + i] * 0.75 + wetRight[from + i];
    sum += outLeft[i] ** 2 + outRight[i] ** 2;
    peak = Math.max(peak, Math.abs(outLeft[i]), Math.abs(outRight[i]));
  }
  const rms = Math.sqrt(sum / (keep * 2));
  const gain = Math.min(TARGET_RMS / rms, 0.85 / peak);
  for (let i = 0; i < keep; i++) {
    outLeft[i] *= gain;
    outRight[i] *= gain;
  }

  const file = path.join(OUT_DIR, `${track.id}.mp3`);
  const mp3 = encode(outLeft, outRight);
  writeFileSync(file, mp3);
  console.log(`music: ${track.id}.mp3, ${loop}s loop, ${Math.round(mp3.length / 1024)} KB`);
}
