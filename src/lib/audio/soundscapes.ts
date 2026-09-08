import { attachLfo, createNoiseBuffer, createNoiseSource, type NoiseColor } from '@/lib/audio/noise';
import { birdCall, cricket, droplet, rustle, strikeBell } from '@/lib/audio/voices';

export type SoundscapeId =
  | 'rain'
  | 'ocean'
  | 'forest'
  | 'night'
  | 'bowl'
  | 'pad'
  | 'drone'
  | 'chimes';

export interface SoundscapeMeta {
  id: SoundscapeId;
  name: string;
  description: string;
}

export const soundscapes: Record<SoundscapeId, SoundscapeMeta> = {
  rain: { id: 'rain', name: 'Rain', description: 'Steady rain against a window' },
  ocean: { id: 'ocean', name: 'Ocean', description: 'Long swells breaking and drawing back' },
  forest: { id: 'forest', name: 'Forest', description: 'Wind in the leaves, distant birds' },
  night: { id: 'night', name: 'Night', description: 'Crickets under a low, still hum' },
  bowl: { id: 'bowl', name: 'Singing Bowl', description: 'A struck bowl left to ring' },
  pad: { id: 'pad', name: 'Warm Pad', description: 'A slow major chord, gently drifting' },
  drone: { id: 'drone', name: 'Deep Drone', description: 'Low sustained fifths' },
  chimes: { id: 'chimes', name: 'Chimes', description: 'Scattered bells over a soft bed' },
};

/** The four offered in the sleep mixer. */
export const sleepSoundscapeIds: SoundscapeId[] = ['rain', 'ocean', 'night', 'drone'];

export const soundscapeList: SoundscapeMeta[] = Object.values(soundscapes);

/**
 * A running soundscape. `stop` fades out over `fadeSeconds` and then tears
 * every node down, so a scape leaves nothing behind on the graph.
 */
export interface SoundscapeHandle {
  output: GainNode;
  stop: (fadeSeconds?: number) => void;
}

interface BuildContext {
  ctx: AudioContext;
  destination: AudioNode;
  buffers: Record<NoiseColor, AudioBuffer>;
}

/**
 * A lookahead scheduler for sparse one-shot events. It wakes every 250ms and
 * schedules anything due in the next second against the audio clock, which
 * keeps event timing sample-accurate even when the main thread is busy.
 */
function createScheduler(
  ctx: AudioContext,
  emit: (when: number) => void,
  nextGap: () => number,
): () => void {
  let nextTime = ctx.currentTime + nextGap();
  const id = window.setInterval(() => {
    const horizon = ctx.currentTime + 1;
    let guard = 0;
    while (nextTime < horizon && guard < 40) {
      emit(Math.max(nextTime, ctx.currentTime + 0.02));
      nextTime += nextGap();
      guard += 1;
    }
  }, 250);
  return () => window.clearInterval(id);
}

/** Wires up the standard fade-out-then-teardown behaviour for a scape. */
function finish(
  ctx: AudioContext,
  output: GainNode,
  targetGain: number,
  nodes: { stop: (when: number) => void }[],
  timers: (() => void)[],
): SoundscapeHandle {
  const now = ctx.currentTime;
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(targetGain, now + 1.6);

  let stopped = false;

  return {
    output,
    stop: (fadeSeconds = 0.8) => {
      if (stopped) return;
      stopped = true;
      timers.forEach((clear) => clear());

      const at = ctx.currentTime;
      output.gain.cancelScheduledValues(at);
      output.gain.setValueAtTime(Math.max(output.gain.value, 0.0001), at);
      output.gain.exponentialRampToValueAtTime(0.0001, at + fadeSeconds);

      const end = at + fadeSeconds + 0.1;
      nodes.forEach((node) => {
        try {
          node.stop(end);
        } catch {
          // Already stopped — nothing to do.
        }
      });
      window.setTimeout(() => output.disconnect(), (fadeSeconds + 0.4) * 1000);
    },
  };
}

/** Adds a detuned oscillator pair, which beats slowly and sounds alive. */
function oscPair(
  ctx: AudioContext,
  destination: AudioNode,
  {
    frequency,
    gain,
    type = 'sine',
    detune = 4,
    when,
  }: { frequency: number; gain: number; type?: OscillatorType; detune?: number; when: number },
): OscillatorNode[] {
  const level = ctx.createGain();
  level.gain.value = gain;
  level.connect(destination);

  return [-detune, detune].map((cents) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = cents;
    osc.connect(level);
    osc.start(when);
    return osc;
  });
}

function buildRain({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // The body of the rain: white noise shaped into a wet, airy band.
  const body = createNoiseSource(ctx, buffers.white, now);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 620;
  highpass.Q.value = 0.7;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3000;
  presence.gain.value = 4;
  presence.Q.value = 0.9;

  const air = ctx.createBiquadFilter();
  air.type = 'lowpass';
  air.frequency.value = 9000;

  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.17;
  body.connect(highpass).connect(presence).connect(air).connect(bodyGain).connect(out);

  // Distant rumble underneath.
  const rumble = createNoiseSource(ctx, buffers.brown, now);
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 180;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.07;
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(out);

  // The shower drifts heavier and lighter over about twenty seconds.
  const drift = attachLfo(ctx, highpass.frequency, { frequency: 0.05, depth: 220, when: now });

  const clearDroplets = createScheduler(
    ctx,
    (when) => droplet(ctx, out, buffers.white, when),
    () => 0.12 + Math.random() * 0.38,
  );

  return finish(ctx, out, 0.9, [body, rumble, drift.osc], [clearDroplets]);
}

function buildOcean({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const swell = createNoiseSource(ctx, buffers.brown, now);
  const shape = ctx.createBiquadFilter();
  shape.type = 'lowpass';
  shape.frequency.value = 620;
  shape.Q.value = 0.6;

  const swellGain = ctx.createGain();
  swellGain.gain.value = 0.2;
  swell.connect(shape).connect(swellGain).connect(out);

  // One slow LFO opens the filter and lifts the level together, which reads as
  // a wave rising; a 13-second period is roughly ocean pace.
  const waveLfo = ctx.createOscillator();
  waveLfo.type = 'sine';
  waveLfo.frequency.value = 0.076;

  const filterDepth = ctx.createGain();
  filterDepth.gain.value = 400;
  waveLfo.connect(filterDepth).connect(shape.frequency);

  const levelDepth = ctx.createGain();
  levelDepth.gain.value = 0.1;
  waveLfo.connect(levelDepth).connect(swellGain.gain);

  // Crest hiss, riding the same swell.
  const hiss = createNoiseSource(ctx, buffers.white, now);
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = 'highpass';
  hissFilter.frequency.value = 2600;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.028;
  const hissDepth = ctx.createGain();
  hissDepth.gain.value = 0.026;
  waveLfo.connect(hissDepth).connect(hissGain.gain);
  hiss.connect(hissFilter).connect(hissGain).connect(out);

  waveLfo.start(now);

  return finish(ctx, out, 0.95, [swell, hiss, waveLfo], []);
}

function buildForest({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const wind = createNoiseSource(ctx, buffers.pink, now);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 700;
  band.Q.value = 0.8;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.48;
  wind.connect(band).connect(windGain).connect(out);

  const gust = attachLfo(ctx, band.frequency, { frequency: 0.045, depth: 460, when: now });
  const breath = attachLfo(ctx, windGain.gain, { frequency: 0.07, depth: 0.18, when: now });

  const clearRustle = createScheduler(
    ctx,
    (when) => rustle(ctx, out, buffers.white, when),
    () => 2 + Math.random() * 4,
  );
  const clearBirds = createScheduler(
    ctx,
    (when) => birdCall(ctx, out, when),
    () => 6 + Math.random() * 11,
  );

  return finish(ctx, out, 0.95, [wind, gust.osc, breath.osc], [clearRustle, clearBirds]);
}

function buildNight({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const airFloor = createNoiseSource(ctx, buffers.brown, now);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 135;
  const floorGain = ctx.createGain();
  floorGain.gain.value = 0.12;
  airFloor.connect(lowpass).connect(floorGain).connect(out);

  // A barely-there fifth holding the bottom of the mix.
  const hum = [
    ...oscPair(ctx, out, { frequency: 55, gain: 0.035, when: now, detune: 2 }),
    ...oscPair(ctx, out, { frequency: 82.4, gain: 0.022, when: now, detune: 3 }),
  ];

  const clearCrickets = createScheduler(
    ctx,
    (when) => cricket(ctx, out, when),
    () => 0.55 + Math.random() * 0.9,
  );

  return finish(ctx, out, 1.2, [airFloor, ...hum], [clearCrickets]);
}

function buildBowl({ ctx, destination }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // Dedicated node for the tremolo, so the fade-out on `out.gain` is clean.
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 1;
  shimmerGain.connect(out);

  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4200;
  tone.connect(shimmerGain);

  // A sustained bowl: the same inharmonic series as a strike, held open, with
  // each partial detuned into a slow beat.
  const fundamental = 196;
  const partials: [number, number][] = [
    [1, 0.15],
    [2.76, 0.06],
    [5.4, 0.03],
    [8.93, 0.014],
  ];

  const oscillators = partials.flatMap(([ratio, gain]) =>
    oscPair(ctx, tone, { frequency: fundamental * ratio, gain, when: now, detune: 3.5 }),
  );
  oscillators.push(...oscPair(ctx, tone, { frequency: fundamental / 2, gain: 0.06, when: now, detune: 2 }));

  // A slow tremolo so the bowl breathes rather than sitting still.
  const shimmer = attachLfo(ctx, shimmerGain.gain, { frequency: 0.13, depth: 0.14, when: now });

  // Re-struck now and then, as if someone is tending it.
  const clearStrikes = createScheduler(
    ctx,
    (when) => strikeBell(ctx, out, { frequency: fundamental, gain: 0.07, decay: 9, when }),
    () => 22 + Math.random() * 20,
  );

  return finish(ctx, out, 0.42, [...oscillators, shimmer.osc], [clearStrikes]);
}

function buildPad({ ctx, destination }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const colour = ctx.createBiquadFilter();
  colour.type = 'lowpass';
  colour.frequency.value = 1150;
  colour.Q.value = 0.5;
  colour.connect(out);

  // A major add9 voicing — open and unresolved rather than sweet.
  const chord = [110, 164.81, 220, 277.18, 329.63];
  const oscillators = chord.flatMap((frequency, index) =>
    oscPair(ctx, colour, {
      frequency,
      gain: index === 0 ? 0.07 : 0.045,
      type: 'triangle',
      detune: 5,
      when: now,
    }),
  );

  const sweep = attachLfo(ctx, colour.frequency, { frequency: 0.038, depth: 420, when: now });

  return finish(ctx, out, 0.72, [...oscillators, sweep.osc], []);
}

function buildDrone({ ctx, destination }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const colour = ctx.createBiquadFilter();
  colour.type = 'lowpass';
  colour.frequency.value = 620;
  colour.connect(out);

  const voices = [
    { frequency: 65.41, gain: 0.1, type: 'sine' as OscillatorType },
    { frequency: 98, gain: 0.07, type: 'sine' as OscillatorType },
    { frequency: 130.81, gain: 0.05, type: 'triangle' as OscillatorType },
    { frequency: 196, gain: 0.03, type: 'triangle' as OscillatorType },
  ];

  const oscillators = voices.flatMap((voice) =>
    oscPair(ctx, colour, { ...voice, detune: 3, when: now }),
  );

  const sweep = attachLfo(ctx, colour.frequency, { frequency: 0.028, depth: 240, when: now });

  return finish(ctx, out, 0.55, [...oscillators, sweep.osc], []);
}

function buildChimes({ ctx, destination }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // A quiet bed so the chimes have something to hang from.
  const bed = ctx.createBiquadFilter();
  bed.type = 'lowpass';
  bed.frequency.value = 800;
  bed.connect(out);

  const oscillators = [
    ...oscPair(ctx, bed, { frequency: 130.81, gain: 0.045, when: now, detune: 3 }),
    ...oscPair(ctx, bed, { frequency: 196, gain: 0.03, when: now, detune: 3 }),
  ];

  // A major pentatonic, so any order of strikes stays consonant.
  const scale = [523.25, 587.33, 698.46, 783.99, 1046.5];
  const clearChimes = createScheduler(
    ctx,
    (when) =>
      strikeBell(ctx, out, {
        frequency: scale[Math.floor(Math.random() * scale.length)],
        gain: 0.07,
        decay: 5.5,
        when,
        pan: Math.random() * 1.2 - 0.6,
      }),
    () => 3.5 + Math.random() * 5.5,
  );

  return finish(ctx, out, 0.95, oscillators, [clearChimes]);
}

const BUILDERS: Record<SoundscapeId, (context: BuildContext) => SoundscapeHandle> = {
  rain: buildRain,
  ocean: buildOcean,
  forest: buildForest,
  night: buildNight,
  bowl: buildBowl,
  pad: buildPad,
  drone: buildDrone,
  chimes: buildChimes,
};

export function buildSoundscape(
  id: SoundscapeId,
  ctx: AudioContext,
  destination: AudioNode,
  buffers: Record<NoiseColor, AudioBuffer>,
): SoundscapeHandle {
  return BUILDERS[id]({ ctx, destination, buffers });
}

export function createNoiseBuffers(ctx: AudioContext): Record<NoiseColor, AudioBuffer> {
  return {
    white: createNoiseBuffer(ctx, 'white'),
    pink: createNoiseBuffer(ctx, 'pink'),
    brown: createNoiseBuffer(ctx, 'brown'),
  };
}
