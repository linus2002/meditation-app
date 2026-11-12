import { describe, expect, it } from 'vitest';

import {
  addDaysToKey,
  dateKeyInZone,
  isValidTimeZone,
  isoWeekday,
  offsetMinutes,
  wallTimeInZone,
  zonedTimeToUtc,
} from '@/lib/circles/tz';

describe('zonedTimeToUtc', () => {
  it('follows London through summer and winter time', () => {
    expect(zonedTimeToUtc('2026-01-15', '07:00', 'Europe/London')).toBe(Date.UTC(2026, 0, 15, 7));
    expect(zonedTimeToUtc('2026-07-01', '07:00', 'Europe/London')).toBe(Date.UTC(2026, 6, 1, 6));
  });

  it('follows New York through summer and winter time', () => {
    expect(zonedTimeToUtc('2026-01-15', '07:00', 'America/New_York')).toBe(
      Date.UTC(2026, 0, 15, 12),
    );
    expect(zonedTimeToUtc('2026-07-01', '07:00', 'America/New_York')).toBe(
      Date.UTC(2026, 6, 1, 11),
    );
  });

  it('handles half- and quarter-hour offsets', () => {
    expect(zonedTimeToUtc('2026-01-15', '07:00', 'Asia/Kolkata')).toBe(
      Date.UTC(2026, 0, 15, 1, 30),
    );
    expect(zonedTimeToUtc('2026-01-15', '07:00', 'Asia/Kathmandu')).toBe(
      Date.UTC(2026, 0, 15, 1, 15),
    );
  });

  it('moves a time that is skipped in spring forward, never loses it', () => {
    // London jumps 01:00 -> 02:00 on 29 March 2026; 01:30 becomes 02:30 BST.
    expect(zonedTimeToUtc('2026-03-29', '01:30', 'Europe/London')).toBe(
      Date.UTC(2026, 2, 29, 1, 30),
    );
    // New York jumps 02:00 -> 03:00 on 8 March 2026; 02:30 becomes 03:30 EDT.
    expect(zonedTimeToUtc('2026-03-08', '02:30', 'America/New_York')).toBe(
      Date.UTC(2026, 2, 8, 7, 30),
    );
  });

  it('is exact for a time just after the spring change', () => {
    expect(zonedTimeToUtc('2026-03-08', '04:00', 'America/New_York')).toBe(
      Date.UTC(2026, 2, 8, 8),
    );
  });

  it('takes the earlier of a time that happens twice in autumn', () => {
    // London falls back 02:00 BST -> 01:00 GMT on 25 October 2026.
    expect(zonedTimeToUtc('2026-10-25', '01:30', 'Europe/London')).toBe(
      Date.UTC(2026, 9, 25, 0, 30),
    );
  });

  it('refuses a malformed time', () => {
    expect(() => zonedTimeToUtc('2026-01-15', '7am', 'Europe/London')).toThrow();
  });
});

describe('reading an instant in a zone', () => {
  const lateEvening = Date.UTC(2026, 0, 15, 23, 30);

  it('gives the local calendar date', () => {
    expect(dateKeyInZone(lateEvening, 'America/New_York')).toBe('2026-01-15');
    expect(dateKeyInZone(lateEvening, 'Asia/Kolkata')).toBe('2026-01-16');
  });

  it('gives the local wall-clock time', () => {
    expect(wallTimeInZone(Date.UTC(2026, 0, 15, 12), 'America/New_York')).toBe('07:00');
    expect(wallTimeInZone(Date.UTC(2026, 0, 15, 0), 'Europe/London')).toBe('00:00');
  });

  it('gives the offset in minutes', () => {
    expect(offsetMinutes(Date.UTC(2026, 0, 15), 'America/New_York')).toBe(-300);
    expect(offsetMinutes(Date.UTC(2026, 6, 1), 'Europe/London')).toBe(60);
    expect(offsetMinutes(Date.UTC(2026, 0, 15), 'Asia/Kathmandu')).toBe(345);
  });
});

describe('calendar keys', () => {
  it('adds days across month and year ends', () => {
    expect(addDaysToKey('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('reads the ISO weekday', () => {
    expect(isoWeekday('2026-03-29')).toBe(7);
    expect(isoWeekday('2026-03-30')).toBe(1);
  });

  it('knows a real zone from a made-up one', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
