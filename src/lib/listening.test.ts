import { describe, expect, it } from 'vitest';

import { advanceListened, finishedProperly } from '@/lib/listening';

/** Plays a run of clock readings through `advanceListened`. */
function listen(readings: number[], running = true): number {
  let heard = 0;
  for (let i = 1; i < readings.length; i += 1) heard = advanceListened(heard, readings[i - 1], readings[i], running);
  return heard;
}

describe('advanceListened', () => {
  it('counts the clock moving forward at playing speed', () => {
    expect(listen([0, 0.25, 0.5, 0.75, 1, 2, 3])).toBeCloseTo(3);
  });

  it('does not count a jump forward (scrubbing or skipping)', () => {
    expect(listen([0, 1, 2, 200, 201])).toBeCloseTo(3);
  });

  it('does not take anything away for a jump back', () => {
    expect(listen([0, 1, 2, 3, 0, 1])).toBeCloseTo(4);
  });

  it('counts nothing while paused', () => {
    expect(listen([0, 5, 10], false)).toBe(0);
  });

  it('copes with a throttled background tab catching up', () => {
    // Timers in a hidden tab fire about once a second.
    expect(listen([0, 1.1, 2.2, 3.1])).toBeCloseTo(3.1);
  });
});

describe('finishedProperly', () => {
  it('needs most of what was left to have been heard', () => {
    expect(finishedProperly(200, 220)).toBe(true);
    expect(finishedProperly(12, 220)).toBe(false);
  });

  it('counts a session resumed near its end', () => {
    // Resumed at 3:00 of 3:40: forty seconds left, all heard.
    expect(finishedProperly(40, 40)).toBe(true);
  });

  it('never counts nothing', () => {
    expect(finishedProperly(0, 0)).toBe(false);
  });
});
