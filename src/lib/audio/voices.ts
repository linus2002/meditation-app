/**
 * One-shot voices: struck bells, breath cues and the small scattered events
 * (droplets, crickets, chirps) that keep the ambient beds from sounding static.
 *
 * Every voice schedules itself against the audio clock and tears its own nodes
 * down when it has finished, so callers never have to track them.
 */

/** Partial ratios of a struck bell — inharmonic, which is what makes it a bell. */
const BELL_PARTIALS = [1, 2, 2.76, 5.4, 8.93];
const BELL_AMPS = [1, 0.5, 0.34, 0.17, 0.08];

export interface BellOptions {
  frequency: number;
  gain?: number;
  decay?: number;
  when?: number;
  pan?: number;
}

/** A struck bell / singing-bowl tone built from inharmonic partials. */
export function strikeBell(
  ctx: BaseAudioContext,
  destination: AudioNode,
  { frequency, gain = 0.1, decay = 5, when, pan = 0 }: BellOptions,
): void {
  const start = when ?? ctx.currentTime;

  const out = ctx.createGain();
  out.gain.value = gain;

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  out.connect(panner).connect(destination);

  BELL_PARTIALS.forEach((ratio, index) => {
    // Upper partials die away faster, as they do on a real bell.
    const partialDecay = decay / (1 + index * 0.65);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    // A touch of detune stops the partials phase-locking into a synthetic tone.
    osc.detune.value = (Math.random() - 0.5) * 6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(BELL_AMPS[index], start + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, start + partialDecay);

    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + partialDecay + 0.1);
    osc.onended = () => {
      env.disconnect();
      osc.disconnect();
    };
  });

  window.setTimeout(
    () => {
      out.disconnect();
      panner.disconnect();
    },
    (start - ctx.currentTime + decay + 0.5) * 1000,
  );
}

/** A soft sine swell used to mark the start of an inhale or an exhale. */
export function breathTone(
  ctx: BaseAudioContext,
  destination: AudioNode,
  { frequency, gain = 0.06, duration = 1 }: { frequency: number; gain?: number; duration?: number },
): void {
  const start = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequency;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + duration * 0.22);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  // A gentle low-pass keeps the cue from cutting through the ambient bed.
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = frequency * 3;

  osc.connect(env).connect(tone).connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
    tone.disconnect();
  };
}

/** A short resonant tick — a raindrop landing on glass. */
export function droplet(
  ctx: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  when: number,
): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900 + Math.random() * 3200;
  band.Q.value = 7 + Math.random() * 6;

  const env = ctx.createGain();
  const peak = 0.02 + Math.random() * 0.03;
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(peak, when + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.05 + Math.random() * 0.06);

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.random() * 1.6 - 0.8;

  source.connect(band).connect(env).connect(panner).connect(destination);
  source.start(when, Math.random() * buffer.duration);
  source.stop(when + 0.2);
  source.onended = () => {
    source.disconnect();
    band.disconnect();
    env.disconnect();
    panner.disconnect();
  };
}

/** A cricket chirp: a high tone gated by a fast amplitude modulator. */
export function cricket(ctx: BaseAudioContext, destination: AudioNode, when: number): void {
  const duration = 0.22 + Math.random() * 0.14;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 4100 + Math.random() * 500;

  // The stridulation rattle — a fast tremolo on the way through.
  const modulator = ctx.createOscillator();
  modulator.type = 'square';
  modulator.frequency.value = 38 + Math.random() * 10;

  const modDepth = ctx.createGain();
  modDepth.gain.value = 0.5;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(0.5, when + 0.02);
  env.gain.setValueAtTime(0.5, when + duration - 0.03);
  env.gain.linearRampToValueAtTime(0, when + duration);

  const level = ctx.createGain();
  level.gain.value = 0.02;

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.random() * 1.8 - 0.9;

  modulator.connect(modDepth).connect(env.gain);
  osc.connect(env).connect(level).connect(panner).connect(destination);

  osc.start(when);
  modulator.start(when);
  osc.stop(when + duration + 0.02);
  modulator.stop(when + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    modulator.disconnect();
    modDepth.disconnect();
    env.disconnect();
    level.disconnect();
    panner.disconnect();
  };
}

/** A short two- or three-note bird call, swept rather than stepped. */
export function birdCall(ctx: BaseAudioContext, destination: AudioNode, when: number): void {
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2400 + Math.random() * 1100;
  const pan = Math.random() * 1.6 - 0.8;

  for (let i = 0; i < notes; i += 1) {
    const at = when + i * (0.09 + Math.random() * 0.05);
    const duration = 0.06 + Math.random() * 0.04;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * (0.92 + Math.random() * 0.1), at);
    osc.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.2), at + duration * 0.6);
    osc.frequency.exponentialRampToValueAtTime(base * 0.95, at + duration);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.055, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    osc.connect(env).connect(panner).connect(destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      panner.disconnect();
    };
  }
}

/** A swell of filtered noise — wind moving through leaves. */
export function rustle(
  ctx: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  when: number,
): void {
  const duration = 0.7 + Math.random() * 1.4;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2600 + Math.random() * 2600;
  band.Q.value = 0.9;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(0.055 + Math.random() * 0.05, when + duration * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.random() * 1.4 - 0.7;

  source.connect(band).connect(env).connect(panner).connect(destination);
  source.start(when, Math.random() * buffer.duration);
  source.stop(when + duration + 0.05);
  source.onended = () => {
    source.disconnect();
    band.disconnect();
    env.disconnect();
    panner.disconnect();
  };
}
