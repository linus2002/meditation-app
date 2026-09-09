import { describe, expect, it } from 'vitest';

import { addDays, dayOfMonth, fromDateKey, lastNDayKeys, relativeDayLabel, toDateKey } from '@/lib/date';

/*
 * These helpers decide which day a sitting counts for, so the local-calendar
 * behaviour is the thing worth pinning down: a session at 23:00 belongs to that
 * evening, not to tomorrow in UTC.
 */
describe('toDateKey', () => {
  it('pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local calendar, not UTC', () => {
    expect(toDateKey(new Date(2026, 8, 9, 23, 30))).toBe('2026-09-09');
    expect(toDateKey(new Date(2026, 8, 9, 0, 30))).toBe('2026-09-09');
  });
});

describe('fromDateKey', () => {
  it('round-trips with toDateKey', () => {
    expect(toDateKey(fromDateKey('2026-09-09'))).toBe('2026-09-09');
  });

  it('lands on local midnight', () => {
    const date = fromDateKey('2026-09-09');
    expect(date.getHours()).toBe(0);
    expect(date.getDate()).toBe(9);
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(toDateKey(addDays(new Date(2026, 8, 30), 1))).toBe('2026-10-01');
  });

  it('crosses a year boundary backwards', () => {
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(toDateKey(addDays(new Date(2028, 1, 28), 1))).toBe('2028-02-29');
  });

  it('does not mutate the date passed in', () => {
    const start = new Date(2026, 8, 9);
    addDays(start, 5);
    expect(toDateKey(start)).toBe('2026-09-09');
  });
});

describe('lastNDayKeys', () => {
  it('is oldest first and ends on the given day', () => {
    const keys = lastNDayKeys(new Date(2026, 8, 9), 7);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-09-03');
    expect(keys[6]).toBe('2026-09-09');
  });

  it('spans a month boundary correctly', () => {
    const keys = lastNDayKeys(new Date(2026, 9, 2), 4);
    expect(keys).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('returns just today for a window of one', () => {
    expect(lastNDayKeys(new Date(2026, 8, 9), 1)).toEqual(['2026-09-09']);
  });
});

describe('relativeDayLabel', () => {
  const today = new Date(2026, 8, 9);

  it('names today and yesterday', () => {
    expect(relativeDayLabel('2026-09-09', today)).toBe('Today');
    expect(relativeDayLabel('2026-09-08', today)).toBe('Yesterday');
  });

  it('falls back to a dated label further back', () => {
    const label = relativeDayLabel('2026-09-01', today);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label).toContain('1');
  });
});

describe('dayOfMonth', () => {
  it('reads the day out of a key', () => {
    expect(dayOfMonth('2026-09-09')).toBe(9);
    expect(dayOfMonth('2026-09-01')).toBe(1);
  });
});
