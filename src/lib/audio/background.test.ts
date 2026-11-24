import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  RELEASE_GRACE_MS,
  bridgeHold,
  claimLockScreen,
  holdBackground,
  resetBackgroundForTests,
  type NowPlaying,
} from '@/lib/audio/background';

type Listener = (event: { action: string; position?: number }) => void;

function installPlugin() {
  let listener: Listener = () => {};
  const plugin = {
    update: vi.fn(async (_state: { holding: boolean; nowPlaying: NowPlaying | null }) => {}),
    addListener: vi.fn((_event: string, next: Listener) => {
      listener = next;
      return { remove: () => {} };
    }),
  };
  vi.stubGlobal('window', {
    Capacitor: { isNativePlatform: () => true, Plugins: { BackgroundSound: plugin } },
  });
  return { plugin, press: (action: string, position?: number) => listener({ action, position }) };
}

const lastState = (plugin: ReturnType<typeof installPlugin>['plugin']) =>
  plugin.update.mock.calls.at(-1)?.[0];

const card = (overrides: Partial<NowPlaying> = {}): NowPlaying => ({
  title: 'Open Heart',
  subtitle: 'Guided meditation',
  duration: 600,
  position: 30,
  playing: true,
  canSeek: true,
  ...overrides,
});

const noControls = { onPlay: () => {}, onPause: () => {} };

afterEach(() => {
  resetBackgroundForTests();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('holdBackground', () => {
  it('runs the service from the first hold to the last release, and a moment after', () => {
    vi.useFakeTimers();
    const { plugin } = installPlugin();

    const session = holdBackground();
    const soundscape = holdBackground();
    expect(plugin.update).toHaveBeenCalledTimes(1);
    expect(lastState(plugin)).toEqual({ holding: true, nowPlaying: null });

    session();
    expect(plugin.update).toHaveBeenCalledTimes(1);

    soundscape();
    expect(lastState(plugin)?.holding).toBe(true);
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
    expect(lastState(plugin)).toEqual({ holding: false, nowPlaying: null });
  });

  it('counts a repeated release once', () => {
    vi.useFakeTimers();
    const { plugin } = installPlugin();

    const first = holdBackground();
    const second = holdBackground();
    first();
    first();
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
    expect(lastState(plugin)?.holding).toBe(true);

    second();
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
    expect(lastState(plugin)?.holding).toBe(false);
  });

  it('never stops between one sound and the next when they meet within the grace', () => {
    vi.useFakeTimers();
    const { plugin } = installPlugin();

    holdBackground()();
    // The card leaving at the same moment must not stop it either.
    const claim = claimLockScreen(2, noControls);
    claim.show(card());
    claim.release();
    vi.advanceTimersByTime(RELEASE_GRACE_MS - 1);
    holdBackground();
    vi.advanceTimersByTime(RELEASE_GRACE_MS * 2);

    expect(plugin.update.mock.calls.every(([state]) => state.holding)).toBe(true);
  });

  it('survives Android refusing the service', () => {
    const { plugin } = installPlugin();
    plugin.update.mockRejectedValueOnce(new Error('background start not allowed'));

    expect(() => holdBackground()()).not.toThrow();
  });

  it('does nothing outside the native app', () => {
    expect(() => holdBackground()()).not.toThrow();
    expect(() => claimLockScreen(2, noControls).show(card())).not.toThrow();
  });
});

describe('bridgeHold', () => {
  it('holds across a mix moving on until the next sound takes over', () => {
    vi.useFakeTimers();
    const { plugin } = installPlugin();

    const first = holdBackground();
    bridgeHold();
    first();
    // Loading the next item takes a while with the screen off.
    vi.advanceTimersByTime(20_000);
    expect(lastState(plugin)?.holding).toBe(true);

    const next = holdBackground();
    next();
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
    // The bridge went when the next sound held, so this release is the last.
    expect(lastState(plugin)?.holding).toBe(false);
  });

  it('lets go by itself if the next sound never starts', () => {
    vi.useFakeTimers();
    const { plugin } = installPlugin();

    bridgeHold(30_000);
    vi.advanceTimersByTime(30_000 + RELEASE_GRACE_MS);
    expect(lastState(plugin)?.holding).toBe(false);
  });
});

describe('claimLockScreen', () => {
  it('shows the highest-ranked card: a session over the soundscape under it', () => {
    const { plugin } = installPlugin();

    const soundscape = claimLockScreen(1, noControls);
    soundscape.show(card({ title: 'Rain', subtitle: 'Steady rain against a window' }));
    expect(lastState(plugin)?.nowPlaying?.title).toBe('Rain');

    const session = claimLockScreen(2, noControls);
    session.show(card());
    expect(lastState(plugin)?.nowPlaying?.title).toBe('Open Heart');

    session.release();
    expect(lastState(plugin)?.nowPlaying?.title).toBe('Rain');

    soundscape.release();
    expect(lastState(plugin)?.nowPlaying).toBeNull();
  });

  it('does not send the same state twice', () => {
    const { plugin } = installPlugin();
    const claim = claimLockScreen(2, noControls);

    claim.show(card());
    claim.show(card());
    expect(plugin.update).toHaveBeenCalledTimes(1);
  });

  it('routes the lock-screen buttons to the card on show', () => {
    const { press } = installPlugin();
    const controls = { onPlay: vi.fn(), onPause: vi.fn(), onSeek: vi.fn(), position: () => 95 };
    claimLockScreen(2, controls).show(card({ position: 90 }));

    press('pause');
    expect(controls.onPause).toHaveBeenCalledTimes(1);
    press('play');
    expect(controls.onPlay).toHaveBeenCalledTimes(1);

    // Skips go from the live position, and stay within the session.
    press('seekforward');
    expect(controls.onSeek).toHaveBeenLastCalledWith(105);
    press('seekto', 9999);
    expect(controls.onSeek).toHaveBeenLastCalledWith(600);
    press('seekbackward');
    expect(controls.onSeek).toHaveBeenLastCalledWith(85);
  });

  it('ignores seeking on a card that cannot seek', () => {
    const { press } = installPlugin();
    const controls = { onPlay: vi.fn(), onPause: vi.fn(), onSeek: vi.fn() };
    claimLockScreen(2, controls).show(card({ canSeek: false }));

    press('seekforward');
    press('seekto', 10);
    expect(controls.onSeek).not.toHaveBeenCalled();
  });
});
