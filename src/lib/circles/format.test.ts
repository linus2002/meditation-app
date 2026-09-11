import { describe, expect, it } from 'vitest';

import {
  describeDays,
  formatAgo,
  formatCountdown,
  formatMinutesSeconds,
} from '@/lib/circles/format';

const MIN = 60_000;

describe('formatCountdown', () => {
  it('reads naturally at every scale', () => {
    expect(formatCountdown(30_000)).toBe('in under a minute');
    expect(formatCountdown(12 * MIN)).toBe('in 12 min');
    expect(formatCountdown(60 * MIN)).toBe('in 1h');
    expect(formatCountdown(200 * MIN)).toBe('in 3h 20m');
  });
});

describe('formatAgo', () => {
  it('reads naturally at every scale', () => {
    expect(formatAgo(10_000)).toBe('just now');
    expect(formatAgo(12 * MIN)).toBe('12 min ago');
    expect(formatAgo(3 * 60 * MIN)).toBe('3h ago');
    expect(formatAgo(26 * 60 * MIN)).toBe('yesterday');
    expect(formatAgo(4 * 24 * 60 * MIN)).toBe('4 days ago');
  });
});

describe('describeDays', () => {
  it('names the common patterns', () => {
    expect(describeDays([1, 2, 3, 4, 5, 6, 7])).toBe('Every day');
    expect(describeDays([5, 4, 3, 2, 1])).toBe('Weekdays');
    expect(describeDays([6, 7])).toBe('Weekends');
    expect(describeDays([3, 1])).toBe('Mon, Wed');
  });
});

describe('formatMinutesSeconds', () => {
  it('pads the seconds', () => {
    expect(formatMinutesSeconds(65)).toBe('1:05');
    expect(formatMinutesSeconds(-4)).toBe('0:00');
  });
});
