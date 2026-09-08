export type NoiseColor = 'white' | 'pink' | 'brown';

/**
 * Builds a looping stereo noise buffer.
 *
 * The two channels are generated independently so the result has natural
 * stereo width, and the buffer is long enough (6s by default) that the loop
 * point is inaudible once the noise has been filtered.
 */
export function createNoiseBuffer(
  ctx: BaseAudioContext,
  color: NoiseColor,
  seconds = 6,
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);

    if (color === 'white') {
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      continue;
    }

    if (color === 'brown') {
      // Leaky integrator: a running sum with a small decay, normalised back up.
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      continue;
    }

    // Pink: Paul Kellet's economy filter — a good 1/f approximation.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  return buffer;
}

/** A looping noise source, already started. */
export function createNoiseSource(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  when: number,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  // Start at a random offset so layers sharing a buffer stay decorrelated.
  source.start(when, Math.random() * buffer.duration);
  return source;
}

/**
 * A low-frequency oscillator wired to modulate an AudioParam around its
 * current value. Returns the oscillator so it can be stopped with the scape.
 */
export function attachLfo(
  ctx: BaseAudioContext,
  target: AudioParam,
  { frequency, depth, when }: { frequency: number; depth: number; when: number },
): { osc: OscillatorNode; gain: GainNode } {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequency;

  const gain = ctx.createGain();
  gain.gain.value = depth;

  osc.connect(gain).connect(target);
  osc.start(when);

  return { osc, gain };
}
