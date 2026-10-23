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
  | 'chimes'
  | 'thunder'
  | 'stream'
  | 'fireplace'
  | 'wind'
  | 'brown'
  | 'heartbeat'
  | 'om'
  | 'theta';

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
  thunder: { id: 'thunder', name: 'Thunderstorm', description: 'Rain with thunder rolling far off' },
  stream: { id: 'stream', name: 'Brook', description: 'Shallow water running over stones' },
  fireplace: { id: 'fireplace', name: 'Fireplace', description: 'A low fire, crackling now and then' },
  wind: { id: 'wind', name: 'Mountain Wind', description: 'Long gusts with a faint whistle' },
  brown: { id: 'brown', name: 'Brown Noise', description: 'Deep, even noise for focus or sleep' },
  heartbeat: { id: 'heartbeat', name: 'Heartbeat', description: 'A slow, steady pulse, sixty a minute' },
  om: { id: 'om', name: 'Om Drone', description: 'A chanted hum, slowly opening and closing' },
  theta: { id: 'theta', name: 'Theta Waves', description: 'A 6 Hz binaural beat; best with headphones' },
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

/**
 * A short burst of filtered noise: a crackle, a pop or a roll of thunder,
 * depending on the filter and how long it takes to die away.
 */
function noiseBurst(
  ctx: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  when: number,
  {
    filter,
    frequency,
    q = 0.7,
    attack,
    decay,
    gain,
    pan = 0,
  }: {
    filter: BiquadFilterType;
    frequency: number;
    q?: number;
    attack: number;
    decay: number;
    gain: number;
    pan?: number;
  },
): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.value = frequency;
  shape.Q.value = q;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(gain, when + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  source.connect(shape).connect(env).connect(panner).connect(destination);
  source.start(when, Math.random() * buffer.duration);
  source.stop(when + attack + decay + 0.1);
  source.onended = () => {
    source.disconnect();
    shape.disconnect();
    env.disconnect();
    panner.disconnect();
  };
}

/** Filtered, looping noise at a fixed level: the bed most scapes start from. */
function noiseBed(
  ctx: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  when: number,
  {
    filter,
    frequency,
    q = 0.7,
    gain,
  }: { filter: BiquadFilterType; frequency: number; q?: number; gain: number },
): { source: AudioBufferSourceNode; shape: BiquadFilterNode; level: GainNode } {
  const source = createNoiseSource(ctx, buffer, when);
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.value = frequency;
  shape.Q.value = q;
  const level = ctx.createGain();
  level.gain.value = gain;
  source.connect(shape).connect(level).connect(destination);
  return { source, shape, level };
}

function buildThunder(context: BuildContext): SoundscapeHandle {
  const { ctx, destination, buffers } = context;
  const out = ctx.createGain();
  out.connect(destination);

  // The storm is the rain scape, a little further away, with thunder over it.
  const rainLevel = ctx.createGain();
  rainLevel.gain.value = 0.75;
  rainLevel.connect(out);
  const rain = buildRain({ ...context, destination: rainLevel });

  const clearThunder = createScheduler(
    ctx,
    (when) => {
      const pan = Math.random() * 1.2 - 0.6;
      // A low roll that swells and takes its time to die away,
      noiseBurst(ctx, out, buffers.brown, when, {
        filter: 'lowpass',
        frequency: 110 + Math.random() * 110,
        attack: 0.5 + Math.random() * 0.8,
        decay: 4 + Math.random() * 4,
        gain: 0.5 + Math.random() * 0.3,
        pan,
      });
      // and now and then the nearer crack at its start.
      if (Math.random() < 0.4) {
        noiseBurst(ctx, out, buffers.brown, when, {
          filter: 'bandpass',
          frequency: 380,
          attack: 0.02,
          decay: 1.2,
          gain: 0.18,
          pan,
        });
      }
    },
    () => 12 + Math.random() * 22,
  );

  return finish(ctx, out, 1, [], [clearThunder, () => rain.stop(0.8)]);
}

function buildStream({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // The body of the water, the brighter babble on top, and a low undertow.
  const body = noiseBed(ctx, out, buffers.pink, now, {
    filter: 'bandpass',
    frequency: 1700,
    q: 0.6,
    gain: 0.32,
  });
  const babble = noiseBed(ctx, out, buffers.white, now, {
    filter: 'bandpass',
    frequency: 3400,
    q: 1.6,
    gain: 0.05,
  });
  const under = noiseBed(ctx, out, buffers.brown, now, { filter: 'lowpass', frequency: 320, gain: 0.08 });

  // Quicker movement than rain: water finding its way over stones.
  const ripple = attachLfo(ctx, babble.shape.frequency, { frequency: 0.31, depth: 700, when: now });
  const flow = attachLfo(ctx, body.shape.frequency, { frequency: 0.09, depth: 300, when: now });

  const clearBubbles = createScheduler(
    ctx,
    (when) => droplet(ctx, out, buffers.white, when),
    () => 0.05 + Math.random() * 0.22,
  );

  return finish(
    ctx,
    out,
    0.85,
    [body.source, babble.source, under.source, ripple.osc, flow.osc],
    [clearBubbles],
  );
}

function buildFireplace({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // The roar of the fire, breathing slowly as it draws.
  const roar = noiseBed(ctx, out, buffers.brown, now, { filter: 'lowpass', frequency: 420, gain: 0.3 });
  const draw = attachLfo(ctx, roar.level.gain, { frequency: 0.11, depth: 0.07, when: now });

  const clearCrackles = createScheduler(
    ctx,
    (when) => {
      // Mostly small, sharp crackles; every so often a deeper pop.
      const pop = Math.random() < 0.12;
      noiseBurst(ctx, out, buffers.white, when, {
        filter: pop ? 'bandpass' : 'highpass',
        frequency: pop ? 700 + Math.random() * 500 : 1600 + Math.random() * 2600,
        q: pop ? 2 : 0.7,
        attack: 0.001,
        decay: pop ? 0.08 + Math.random() * 0.06 : 0.008 + Math.random() * 0.03,
        gain: pop ? 0.22 : 0.04 + Math.random() * 0.16,
        pan: Math.random() * 1.2 - 0.6,
      });
    },
    () => 0.04 + Math.random() * 0.55,
  );

  return finish(ctx, out, 0.9, [roar.source, draw.osc], [clearCrackles]);
}

function buildWind({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  const gusts = noiseBed(ctx, out, buffers.pink, now, {
    filter: 'bandpass',
    frequency: 520,
    q: 0.7,
    gain: 0.5,
  });
  const sweep = attachLfo(ctx, gusts.shape.frequency, { frequency: 0.032, depth: 340, when: now });
  const swell = attachLfo(ctx, gusts.level.gain, { frequency: 0.05, depth: 0.26, when: now });

  // A thin whistle, as through a gap in the rocks, coming and going.
  const whistle = noiseBed(ctx, out, buffers.white, now, {
    filter: 'bandpass',
    frequency: 1350,
    q: 18,
    gain: 0.03,
  });
  const pitch = attachLfo(ctx, whistle.shape.frequency, { frequency: 0.06, depth: 280, when: now });
  const fade = attachLfo(ctx, whistle.level.gain, { frequency: 0.043, depth: 0.028, when: now });

  return finish(
    ctx,
    out,
    0.9,
    [gusts.source, whistle.source, sweep.osc, swell.osc, pitch.osc, fade.osc],
    [],
  );
}

function buildBrown({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // Deliberately still: the point of plain noise is that nothing changes.
  const bed = noiseBed(ctx, out, buffers.brown, now, { filter: 'lowpass', frequency: 900, gain: 0.36 });

  return finish(ctx, out, 0.9, [bed.source], []);
}

function buildHeartbeat({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // A muffled bed, as if heard from inside.
  const bed = noiseBed(ctx, out, buffers.brown, now, { filter: 'lowpass', frequency: 200, gain: 0.07 });

  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 160;
  tone.connect(out);

  const thump = (when: number, gain: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(62, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.14);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    osc.connect(env).connect(tone);
    osc.start(when);
    osc.stop(when + 0.22);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  };

  // Lub, then dub, sixty times a minute.
  const clearBeats = createScheduler(
    ctx,
    (when) => {
      thump(when, 0.55);
      thump(when + 0.27, 0.34);
    },
    () => 1,
  );

  return finish(ctx, out, 1, [bed.source], [clearBeats]);
}

function buildOm({ ctx, destination }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // Two vowel formants over a rich hum; sliding the first down and back turns
  // an open "o" into a closed "m" and out again.
  const mouth = ctx.createGain();
  mouth.gain.value = 1;
  const first = ctx.createBiquadFilter();
  first.type = 'bandpass';
  first.frequency.value = 420;
  first.Q.value = 5;
  const second = ctx.createBiquadFilter();
  second.type = 'bandpass';
  second.frequency.value = 820;
  second.Q.value = 7;
  const secondLevel = ctx.createGain();
  secondLevel.gain.value = 0.45;
  mouth.connect(first).connect(out);
  mouth.connect(second).connect(secondLevel).connect(out);

  const fundamental = 136.1;
  const oscillators = [
    ...oscPair(ctx, mouth, { frequency: fundamental, gain: 0.32, type: 'sawtooth', detune: 4, when: now }),
    ...oscPair(ctx, out, { frequency: fundamental / 2, gain: 0.05, detune: 2, when: now }),
  ];

  const vowel = attachLfo(ctx, first.frequency, { frequency: 0.05, depth: 150, when: now });
  const close = attachLfo(ctx, secondLevel.gain, { frequency: 0.05, depth: 0.3, when: now });

  return finish(ctx, out, 0.7, [...oscillators, vowel.osc, close.osc], []);
}

function buildTheta({ ctx, destination, buffers }: BuildContext): SoundscapeHandle {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(destination);

  // One steady tone in each ear, 6 Hz apart; the brain hears the difference as
  // a slow pulse. It only works through headphones.
  const ears = [
    { frequency: 200, pan: -1 },
    { frequency: 206, pan: 1 },
  ].map(({ frequency, pan }) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const level = ctx.createGain();
    level.gain.value = 0.09;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(level).connect(panner).connect(out);
    osc.start(now);
    return osc;
  });

  const bed = noiseBed(ctx, out, buffers.pink, now, { filter: 'lowpass', frequency: 600, gain: 0.05 });

  return finish(ctx, out, 0.8, [...ears, bed.source], []);
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
  thunder: buildThunder,
  stream: buildStream,
  fireplace: buildFireplace,
  wind: buildWind,
  brown: buildBrown,
  heartbeat: buildHeartbeat,
  om: buildOm,
  theta: buildTheta,
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
