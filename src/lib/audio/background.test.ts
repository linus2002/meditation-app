import { afterEach, describe, expect, it, vi } from 'vitest';

import { holdBackground } from '@/lib/audio/background';

function installPlugin() {
  const plugin = {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
  };
  vi.stubGlobal('window', {
    Capacitor: { isNativePlatform: () => true, Plugins: { BackgroundSound: plugin } },
  });
  return plugin;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('holdBackground', () => {
  it('runs the service from the first hold to the last release', () => {
    const plugin = installPlugin();

    const session = holdBackground();
    const soundscape = holdBackground();
    expect(plugin.start).toHaveBeenCalledTimes(1);

    session();
    expect(plugin.stop).not.toHaveBeenCalled();

    soundscape();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
  });

  it('counts a repeated release once', () => {
    const plugin = installPlugin();

    const first = holdBackground();
    const second = holdBackground();
    first();
    first();
    expect(plugin.stop).not.toHaveBeenCalled();

    second();
    expect(plugin.stop).toHaveBeenCalledTimes(1);
  });

  it('survives Android refusing the service', () => {
    const plugin = installPlugin();
    plugin.start.mockRejectedValueOnce(new Error('background start not allowed'));

    expect(() => holdBackground()()).not.toThrow();
  });

  it('does nothing outside the native app', () => {
    expect(() => holdBackground()()).not.toThrow();
  });
});
