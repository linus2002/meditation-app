import { describe, expect, it } from 'vitest';

import {
  averageClock,
  formatClockMinutes,
  hoursAsleep,
  minutesAsleep,
  parseClock,
  recentNights,
  summariseSleep,
} from '@/lib/sleep-stats';
import type { SleepLog } from '@/types';

const log = (date: string, bedtime: string, wakeTime: string, quality = 3): SleepLog => ({
  date,
  bedtime,
  wakeTime,
  quality,
  updatedAt: 0,
});

/** Fixed so the suite does not change behaviour at midnight or in another TZ. */
const TODAY = new Date(2026, 8, 9);

describe('parseClock', () => {
  it('reads a local clock time as minutes past midnight', () => {
    expect(parseClock('00:00')).toBe(0);
    expect(parseClock('22:48')).toBe(1368);
    expect(parseClock('23:59')).toBe(1439);
  });

  it('accepts a single-digit hour', () => {
    expect(parseClock('7:05')).toBe(425);
  });

  it('rejects out-of-range and malformed input rather than coercing it', () => {
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('22:61')).toBeNull();
    expect(parseClock('')).toBeNull();
    expect(parseClock('bedtime')).toBeNull();
    expect(parseClock('22:5')).toBeNull();
  });
});

describe('formatClockMinutes', () => {
  it('pads to a two-digit clock', () => {
    expect(formatClockMinutes(425)).toBe('07:05');
  });

  it('wraps past a day rather than printing hour 25', () => {
    expect(formatClockMinutes(25 * 60)).toBe('01:00');
    expect(formatClockMinutes(-60)).toBe('23:00');
  });
});

describe('minutesAsleep', () => {
  it('measures a stretch inside one day', () => {
    expect(minutesAsleep('13:00', '14:30')).toBe(90);
  });

  it('crosses midnight, which is the normal case', () => {
    expect(minutesAsleep('23:00', '07:00')).toBe(480);
    expect(minutesAsleep('22:48', '05:36')).toBe(408);
  });

  it('handles going to bed after midnight', () => {
    expect(minutesAsleep('00:30', '08:00')).toBe(450);
  });

  it('treats identical times as zero, not a full day', () => {
    expect(minutesAsleep('23:00', '23:00')).toBe(0);
  });

  it('returns null for input it cannot read', () => {
    expect(minutesAsleep('25:00', '07:00')).toBeNull();
    expect(minutesAsleep('23:00', '')).toBeNull();
  });
});

describe('hoursAsleep', () => {
  it('converts a logged night to hours', () => {
    expect(hoursAsleep(log('2026-09-09', '23:00', '07:00'))).toBe(8);
  });

  it('reports zero rather than NaN when the times are unreadable', () => {
    expect(hoursAsleep(log('2026-09-09', 'x', 'y'))).toBe(0);
  });
});

describe('averageClock', () => {
  it('averages times that do not wrap', () => {
    expect(averageClock(['22:00', '23:00'])).toBe('22:30');
  });

  /*
   * The reason this is a circular mean and not an arithmetic one. Averaging
   * 23:40 and 00:20 numerically gives 12:00 — off by twelve hours, and it would
   * have reported a lunchtime bedtime to anyone who went to bed around
   * midnight.
   */
  it('averages across midnight without landing at midday', () => {
    expect(averageClock(['23:40', '00:20'])).toBe('00:00');
    expect(averageClock(['23:00', '01:00'])).toBe('00:00');
  });

  it('returns the time itself when there is only one', () => {
    expect(averageClock(['22:48'])).toBe('22:48');
  });

  it('returns null rather than guessing when there is no mean', () => {
    expect(averageClock([])).toBeNull();
    expect(averageClock(['00:00', '12:00'])).toBeNull();
  });

  it('ignores entries it cannot parse', () => {
    expect(averageClock(['22:00', 'nonsense', '23:00'])).toBe('22:30');
  });
});

describe('summariseSleep', () => {
  const logs = [
    log('2026-09-09', '23:00', '07:00', 4),
    log('2026-09-08', '23:30', '06:30', 2),
    log('2026-01-01', '20:00', '10:00', 5), // outside the window
  ];

  it('counts only the nights inside the window', () => {
    expect(summariseSleep(logs, TODAY, 7).nights).toBe(2);
  });

  it('averages hours over the logged nights, not the whole window', () => {
    expect(summariseSleep(logs, TODAY, 7).averageHours).toBeCloseTo(7.5, 5);
  });

  it('rescales quality from the stored 1-5 to a fraction', () => {
    expect(summariseSleep(logs, TODAY, 7).averageQuality).toBeCloseTo(0.5, 5);
  });

  /*
   * The whole point of the screen's rewrite: with nothing logged it must say
   * nothing. A zero here would render as "0.0h" and read as a measurement.
   */
  it('reports null, never zero, when nothing is logged', () => {
    const empty = summariseSleep([], TODAY, 7);
    expect(empty.nights).toBe(0);
    expect(empty.averageHours).toBeNull();
    expect(empty.averageQuality).toBeNull();
    expect(empty.bedtime).toBeNull();
    expect(empty.wakeTime).toBeNull();
  });

  it('ignores logs dated after today', () => {
    const withFuture = [...logs, log('2026-09-20', '22:00', '06:00')];
    expect(summariseSleep(withFuture, TODAY, 7).nights).toBe(2);
  });
});

describe('recentNights', () => {
  const logs = [log('2026-09-09', '23:00', '07:00'), log('2026-09-08', '23:30', '06:30')];

  it('always returns the full window', () => {
    expect(recentNights(logs, TODAY, 7)).toHaveLength(7);
  });

  it('marks missing nights instead of dropping them', () => {
    const nights = recentNights(logs, TODAY, 7);
    expect(nights.filter((night) => night.logged)).toHaveLength(2);
    expect(nights[0].logged).toBe(false);
    expect(nights[0].hours).toBe(0);
  });

  it('runs oldest first so the chart reads left to right', () => {
    const nights = recentNights(logs, TODAY, 7);
    expect(nights[0].key).toBe('2026-09-03');
    expect(nights[6].key).toBe('2026-09-09');
  });

  it('carries the hours of a logged night through', () => {
    const nights = recentNights(logs, TODAY, 7);
    expect(nights[6].hours).toBe(8);
    expect(nights[5].hours).toBe(7);
  });
});
