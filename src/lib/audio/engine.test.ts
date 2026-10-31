import { afterEach, describe, expect, it, vi } from 'vitest';

import { AudioEngine } from '@/lib/audio/engine';

/** Just enough of an AudioContext for the master chain to be built. */
class FakeContext {
  state = 'suspended';
  currentTime = 12;
  destination = {};
  onstatechange: (() => void) | null = null;

  private node() {
    const param = { value: 0 };
    return {
      gain: param,
      threshold: param,
      knee: param,
      ratio: param,
      attack: param,
      release: param,
      fftSize: 0,
      connect: (next: unknown) => next,
    };
  }

  createDynamicsCompressor = () => this.node();
  createGain = () => this.node();
  createAnalyser = () => this.node();
  createBuffer = (_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  });
  resume = async () => {
    this.state = 'running';
  };

  move(state: string) {
    this.state = state;
    this.onstatechange?.();
  }
}

/** An engine with a live context, optionally with a soundscape "playing". */
async function setUp({ sounding }: { sounding: boolean }) {
  const context = new FakeContext();
  vi.stubGlobal('window', {
    // Called with `new`; a constructor that returns an object yields that object.
    AudioContext: function AudioContextStub() {
      return context;
    },
  });
  vi.stubGlobal('navigator', {});

  const engine = new AudioEngine();
  await engine.resume();
  if (sounding) {
    (engine as unknown as { current: unknown }).current = {
      id: 'rain',
      handle: { stop: () => {} },
    };
  }
  return { engine, context };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AudioEngine interruption', () => {
  it('reports sound being cut off from outside', async () => {
    const { engine, context } = await setUp({ sounding: true });
    const listener = vi.fn();
    engine.onInterrupted(listener);

    context.move('suspended');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('counts iOS interruptions, which have their own state', async () => {
    const { engine, context } = await setUp({ sounding: true });
    const listener = vi.fn();
    engine.onInterrupted(listener);

    context.move('interrupted');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when nothing was sounding, or the sound came back', async () => {
    const silent = await setUp({ sounding: false });
    const silentListener = vi.fn();
    silent.engine.onInterrupted(silentListener);
    silent.context.move('suspended');
    expect(silentListener).not.toHaveBeenCalled();

    const playing = await setUp({ sounding: true });
    const playingListener = vi.fn();
    playing.engine.onInterrupted(playingListener);
    playing.context.move('running');
    expect(playingListener).not.toHaveBeenCalled();
  });

  it('stops calling a listener once it unsubscribes', async () => {
    const { engine, context } = await setUp({ sounding: true });
    const listener = vi.fn();
    engine.onInterrupted(listener)();

    context.move('suspended');
    expect(listener).not.toHaveBeenCalled();
  });

  it('only exposes the sound clock while something is sounding', async () => {
    const silent = await setUp({ sounding: false });
    expect(silent.engine.soundClock).toBeNull();

    const playing = await setUp({ sounding: true });
    expect(playing.engine.soundClock).toBe(12);
  });
});
