import { describe, expect, it } from 'vitest';

import {
  formatTime12,
  isFinished,
  isScheduleDue,
  monthGrid,
  occursOn,
  parseSchedules,
  repeatLabel,
  scheduleUrl,
  schedulesOn,
  upcomingOccurrences,
  type ScheduledSession,
} from './schedule';

// 2026-11-13 is a Friday.
const base: ScheduledSession = {
  id: 's1',
  kind: 'meditation',
  itemId: 'morning-clarity',
  date: '2026-11-13',
  time: '07:30',
  repeat: 'once',
  createdAt: 0,
};
const at = (key: string, time: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
};

describe('which days a schedule falls on', () => {
  it('once: only its own date', () => {
    expect(occursOn(base, '2026-11-13')).toBe(true);
    expect(occursOn(base, '2026-11-14')).toBe(false);
  });

  it('never before its start date', () => {
    expect(occursOn({ ...base, repeat: 'daily' }, '2026-11-12')).toBe(false);
    expect(occursOn({ ...base, repeat: 'daily' }, '2026-12-25')).toBe(true);
  });

  it('weekdays: Monday to Friday only', () => {
    const weekdays = { ...base, repeat: 'weekdays' as const };
    expect(occursOn(weekdays, '2026-11-14')).toBe(false); // Saturday
    expect(occursOn(weekdays, '2026-11-15')).toBe(false); // Sunday
    expect(occursOn(weekdays, '2026-11-16')).toBe(true); // Monday
  });

  it('weekly: the same weekday as its start', () => {
    const weekly = { ...base, repeat: 'weekly' as const };
    expect(occursOn(weekly, '2026-11-20')).toBe(true); // next Friday
    expect(occursOn(weekly, '2026-11-19')).toBe(false);
    expect(repeatLabel(weekly)).toBe('Every Friday');
  });

  it('lists a day’s schedules by time', () => {
    const late = { ...base, id: 's2', time: '21:00' };
    const early = { ...base, id: 's3', time: '06:15' };
    expect(schedulesOn([late, base, early], '2026-11-13').map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });
});

describe('notifications', () => {
  it('is due from its time until the late limit, once per day', () => {
    expect(isScheduleDue(base, at('2026-11-13', '07:29'), undefined)).toBe(false);
    expect(isScheduleDue(base, at('2026-11-13', '07:30'), undefined)).toBe(true);
    expect(isScheduleDue(base, at('2026-11-13', '07:50'), undefined)).toBe(true);
    expect(isScheduleDue(base, at('2026-11-13', '08:30'), undefined)).toBe(false);
    expect(isScheduleDue(base, at('2026-11-13', '07:35'), '2026-11-13')).toBe(false);
  });

  it('hands over the nearest future moments only, capped', () => {
    const daily = { ...base, repeat: 'daily' as const };
    const next = upcomingOccurrences([daily], at('2026-11-13', '08:00'), 30, 5);
    expect(next).toHaveLength(5);
    expect(next[0].at).toEqual(at('2026-11-14', '07:30')); // today's has passed
    const once = upcomingOccurrences([base], at('2026-11-13', '08:00'), 30, 5);
    expect(once).toHaveLength(0);
  });

  it('a once-only schedule is finished once well past', () => {
    expect(isFinished(base, at('2026-11-13', '07:45'))).toBe(false);
    expect(isFinished(base, at('2026-11-13', '09:00'))).toBe(true);
    expect(isFinished({ ...base, repeat: 'daily' }, at('2027-01-01', '09:00'))).toBe(false);
  });

  it('opens the right screen for each kind', () => {
    expect(scheduleUrl(base)).toBe('/player/morning-clarity');
    expect(scheduleUrl({ kind: 'story', itemId: 'lighthouse' })).toBe('/stories/lighthouse');
    expect(scheduleUrl({ kind: 'yoga', itemId: 'desk-stretch' })).toBe('/yoga/desk-stretch');
  });
});

describe('calendar helpers', () => {
  it('lays out November 2026 Sunday-first', () => {
    const weeks = monthGrid(2026, 10);
    expect(weeks[0][0]).toBe('2026-11-01'); // 1 Nov 2026 is a Sunday
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('formats times for people', () => {
    expect(formatTime12('07:30')).toBe('7:30 AM');
    expect(formatTime12('00:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('21:45')).toBe('9:45 PM');
  });

  it('drops malformed stored schedules', () => {
    const raw = JSON.stringify([base, { ...base, id: 'bad', time: '25:00' }, { ...base, kind: 'video' }, null]);
    expect(parseSchedules(raw).map((s) => s.id)).toEqual(['s1']);
    expect(parseSchedules('{oops')).toEqual([]);
  });
});
