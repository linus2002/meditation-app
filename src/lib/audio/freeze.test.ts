import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { watchForFreeze } from '@/lib/audio/freeze';

const START = 1_000_000;

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(START);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('watchForFreeze', () => {
  it('reports a freeze when the sound stopped along with the ticks', () => {
    const watch = watchForFreeze(() => 50);

    expect(watch.frozen(START + 3_600_000)).toBe(true);
    expect(watch.lastTick).toBe(START);
  });

  it('leaves throttled timers alone while the sound carries on', () => {
    let clock = 50;
    const watch = watchForFreeze(() => clock);

    clock += 60;
    expect(watch.frozen(START + 60_000)).toBe(false);
    expect(watch.lastTick).toBe(START + 60_000);
  });

  it('never reports a freeze without sound, so a silent sit keeps counting', () => {
    const watch = watchForFreeze(() => null);

    expect(watch.frozen(START + 3_600_000)).toBe(false);
  });

  it('ignores a short hiccup', () => {
    const watch = watchForFreeze(() => 50);

    expect(watch.frozen(START + 3000)).toBe(false);
  });
});
