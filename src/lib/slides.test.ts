import { describe, expect, it } from 'vitest';

import { DOT, dotAt, easeInOutCubic, glideMs, stepsInView } from '@/lib/slides';

describe('the tour’s glide', () => {
  it('starts and ends at rest, and is halfway at half time', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    // Gentle at the start, not a jump.
    expect(easeInOutCubic(0.1)).toBeLessThan(0.01);
  });

  it('takes a little longer for a longer jump, within limits', () => {
    expect(glideMs(1)).toBe(560);
    expect(glideMs(3)).toBeGreaterThan(glideMs(1));
    expect(glideMs(-3)).toBe(glideMs(3));
    expect(glideMs(20)).toBeLessThanOrEqual(820);
  });
});

describe('which steps are in view', () => {
  it('is only the step at rest', () => {
    expect(stepsInView(0, 4)).toEqual([0]);
    expect(stepsInView(2, 4)).toEqual([2]);
    expect(stepsInView(3, 4)).toEqual([3]);
  });

  it('brings the next step’s text in early, before the halfway point', () => {
    expect(stepsInView(0.1, 4)).toEqual([0]);
    expect(stepsInView(0.25, 4)).toEqual([0, 1]);
    expect(stepsInView(0.9, 4)).toEqual([1]);
  });

  it('keeps to the steps there are', () => {
    expect(stepsInView(-0.5, 4)).toEqual([0]);
    expect(stepsInView(3.4, 4)).toEqual([3]);
  });
});

describe('the dots', () => {
  it('follow the strip between steps', () => {
    expect(dotAt(1, 1)).toEqual({ width: DOT.active, opacity: 1 });
    expect(dotAt(1, 0)).toEqual({ width: DOT.idle, opacity: DOT.idleOpacity });
    const half = dotAt(0.5, 1);
    expect(half.width).toBeCloseTo((DOT.idle + DOT.active) / 2, 5);
    expect(dotAt(0.5, 0).width).toBeCloseTo(half.width, 5);
  });
});
