import { describe, expect, it } from 'vitest';

import {
  dayKey,
  isDue,
  msUntilNext,
  nextOccurrence,
  parseTime,
  reminderBody,
  reminderDefinitions,
  upcomingDaily,
  type ReminderDefinition,
} from '@/lib/reminders';

const daily: ReminderDefinition = {
  id: 'reminders',
  time: '07:00',
  title: 'Today is waiting',
  body: 'A few quiet minutes.',
  url: '/home',
  nativeId: 1,
};

describe('parseTime', () => {
  it('reads a wall-clock time', () => {
    expect(parseTime('07:00')).toEqual({ hours: 7, minutes: 0 });
    expect(parseTime('22:30')).toEqual({ hours: 22, minutes: 30 });
  });

  it('rejects anything that is not a real time', () => {
    expect(parseTime('7am')).toBeNull();
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('stays on today when the time is still ahead', () => {
    const from = new Date(2026, 2, 10, 6, 30);
    expect(nextOccurrence('07:00', from)).toEqual(new Date(2026, 2, 10, 7, 0, 0, 0));
  });

  it('rolls to tomorrow once the time has passed', () => {
    const from = new Date(2026, 2, 10, 7, 30);
    expect(nextOccurrence('07:00', from)).toEqual(new Date(2026, 2, 11, 7, 0, 0, 0));
  });

  it('rolls to tomorrow on the exact minute, rather than firing twice', () => {
    const from = new Date(2026, 2, 10, 7, 0, 0, 0);
    expect(nextOccurrence('07:00', from)).toEqual(new Date(2026, 2, 11, 7, 0, 0, 0));
  });

  it('crosses a month end', () => {
    const from = new Date(2026, 0, 31, 23, 0);
    expect(nextOccurrence('07:00', from)).toEqual(new Date(2026, 1, 1, 7, 0, 0, 0));
  });

  it('keeps the wall-clock hour rather than a fixed offset', () => {
    const from = new Date(2026, 2, 10, 8, 0);
    const next = nextOccurrence('22:30', from);
    expect(next.getHours()).toBe(22);
    expect(next.getMinutes()).toBe(30);
  });

  it('reports the wait in milliseconds', () => {
    const from = new Date(2026, 2, 10, 6, 30);
    expect(msUntilNext('07:00', from)).toBe(30 * 60 * 1000);
  });
});

describe('dayKey', () => {
  it('pads to YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});

describe('isDue', () => {
  it('is due just after its time, when nothing was delivered today', () => {
    expect(isDue(daily, new Date(2026, 2, 10, 7, 0, 30), undefined)).toBe(true);
  });

  it('is not due before its time', () => {
    expect(isDue(daily, new Date(2026, 2, 10, 6, 59), undefined)).toBe(false);
  });

  it('is not due once it has been delivered today', () => {
    expect(isDue(daily, new Date(2026, 2, 10, 7, 5), '2026-03-10')).toBe(false);
  });

  it('is due again the next day', () => {
    expect(isDue(daily, new Date(2026, 2, 11, 7, 5), '2026-03-10')).toBe(true);
  });

  it('stays quiet rather than arriving hours late', () => {
    // Opening the app at lunchtime should not produce a "good morning" nudge.
    expect(isDue(daily, new Date(2026, 2, 10, 12, 0), undefined)).toBe(false);
  });

  it('still delivers inside the late window', () => {
    expect(isDue(daily, new Date(2026, 2, 10, 7, 25), undefined)).toBe(true);
  });
});

describe('reminderDefinitions', () => {
  it('gives every reminder a distinct id and native id', () => {
    const ids = reminderDefinitions.map((entry) => entry.id);
    const nativeIds = reminderDefinitions.map((entry) => entry.nativeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(nativeIds).size).toBe(nativeIds.length);
  });

  it('carries times the scheduler can actually parse', () => {
    for (const entry of reminderDefinitions) {
      expect(parseTime(entry.time)).not.toBeNull();
    }
  });
});

describe('daily inspiration', () => {
  const inspiration = reminderDefinitions.find((entry) => entry.id === 'inspiration');

  it('exists as a scheduled reminder', () => {
    expect(inspiration).toBeDefined();
  });

  it('says something different each day', () => {
    if (!inspiration) return;
    expect(reminderBody(inspiration, '2026-09-12')).not.toBe(reminderBody(inspiration, '2026-09-13'));
  });

  it('may still arrive later in the day, but not at night', () => {
    if (!inspiration) return;
    expect(isDue(inspiration, new Date(2026, 8, 12, 13, 0), undefined)).toBe(true);
    expect(isDue(inspiration, new Date(2026, 8, 12, 23, 0), undefined)).toBe(false);
  });

  it('leaves fixed reminders with their fixed words', () => {
    expect(reminderBody(daily, '2026-09-12')).toBe(daily.body);
  });
});

describe('upcomingDaily', () => {
  it('starts today while the time is still ahead', () => {
    expect(upcomingDaily('08:00', new Date(2026, 8, 12, 7, 0), 2)).toEqual([
      new Date(2026, 8, 12, 8, 0),
      new Date(2026, 8, 13, 8, 0),
    ]);
  });

  it('starts tomorrow once today has passed, then runs day by day', () => {
    expect(upcomingDaily('08:00', new Date(2026, 8, 12, 9, 0), 3)).toEqual([
      new Date(2026, 8, 13, 8, 0),
      new Date(2026, 8, 14, 8, 0),
      new Date(2026, 8, 15, 8, 0),
    ]);
  });

  it('crosses a month end', () => {
    const dates = upcomingDaily('08:00', new Date(2026, 8, 30, 9, 0), 2);
    expect(dates[1]).toEqual(new Date(2026, 9, 2, 8, 0));
  });
});
