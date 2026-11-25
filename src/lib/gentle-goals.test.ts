import { describe, expect, it } from 'vitest';

import { startOfWeek, toDateKey } from '@/lib/date';
import { streakDetail, weekLine, weekProgress, weeksInARow } from '@/lib/session-stats';
import type { SessionRecord } from '@/types';

const TODAY = new Date(2026, 8, 9); // Wed 9 Sep 2026; the week runs Mon 7 to Sun 13.

let counter = 0;
const sit = (date: string): SessionRecord => ({
  id: `g${counter++}`,
  meditationId: 'body-scan',
  date,
  seconds: 600,
  completed: true,
  startedAt: 0,
});
const sits = (...dates: string[]) => dates.map(sit);

describe('startOfWeek', () => {
  it('starts weeks on Monday', () => {
    expect(toDateKey(startOfWeek(TODAY))).toBe('2026-09-07');
    expect(toDateKey(startOfWeek(new Date(2026, 8, 13)))).toBe('2026-09-07'); // Sunday
    expect(toDateKey(startOfWeek(new Date(2026, 8, 7)))).toBe('2026-09-07'); // Monday itself
  });
});

describe('streakDetail', () => {
  it('starts with this week’s rest day free', () => {
    expect(streakDetail([], TODAY)).toEqual({ days: 0, restDays: [], restLeftThisWeek: true });
  });

  it('uses one rest day in each week, across week boundaries', () => {
    // Missed Tue 8 (this week) and Sun 6 (last week): both carried.
    const detail = streakDetail(sits('2026-09-09', '2026-09-07', '2026-09-05', '2026-09-04'), TODAY);
    expect(detail.days).toBe(4);
    expect(detail.restDays).toEqual(['2026-09-08', '2026-09-06']);
    expect(detail.restLeftThisWeek).toBe(false);
  });

  it('says this week’s rest day is still free when nothing was missed', () => {
    const detail = streakDetail(sits('2026-09-09', '2026-09-08', '2026-09-07'), TODAY);
    expect(detail).toMatchObject({ days: 3, restDays: [], restLeftThisWeek: true });
  });

  it('does not count rest days that bridge to nothing', () => {
    // Mon 7 and Sun 6 missed would each be a rest day, but Sat 5 breaks it,
    // so neither joined two days sat together.
    const detail = streakDetail(sits('2026-09-08', '2026-09-04'), TODAY);
    expect(detail.days).toBe(1);
    expect(detail.restDays).toEqual([]);
    expect(detail.restLeftThisWeek).toBe(true);
  });

  it('never lets today break the run before it is over', () => {
    expect(streakDetail(sits('2026-09-08', '2026-09-07'), TODAY).days).toBe(2);
  });

  it('keeps going when yesterday was this week’s rest day and today is not over', () => {
    // Today unsat, Tue 8 missed (rest), Mon 7 sat.
    expect(streakDetail(sits('2026-09-07', '2026-09-06'), TODAY)).toMatchObject({
      days: 2,
      restDays: ['2026-09-08'],
    });
  });
});

describe('weekProgress', () => {
  it('counts days sat this week against the goal', () => {
    const week = weekProgress(sits('2026-09-07', '2026-09-09', '2026-09-09', '2026-09-06'), TODAY, 3);
    expect(week.start).toBe('2026-09-07');
    expect(week.days).toHaveLength(7);
    expect(week.daysSat).toBe(2); // Sunday 6 belongs to last week; two sits on the 9th are one day
    expect(week.met).toBe(false);
    expect(week.days.map((day) => day.future)).toEqual([false, false, false, true, true, true, true]);
  });

  it('reads naturally under and over the goal', () => {
    expect(weekLine({ daysSat: 2, goal: 3 })).toBe('2 of 3 days this week');
    expect(weekLine({ daysSat: 1, goal: 1 })).toBe('1 of 1 day this week');
    expect(weekLine({ daysSat: 4, goal: 2 })).toBe('4 days this week');
  });

  it('is met once the goal is reached', () => {
    expect(weekProgress(sits('2026-09-07', '2026-09-08'), TODAY, 2).met).toBe(true);
  });
});

describe('weeksInARow', () => {
  it('counts this week once it is met', () => {
    const sessions = sits('2026-09-07', '2026-09-09', '2026-09-01', '2026-09-03');
    expect(weeksInARow(sessions, TODAY, 2)).toBe(2);
  });

  it('counts from last week while this week is still under way', () => {
    const sessions = sits('2026-09-07', '2026-08-31', '2026-09-02', '2026-09-04');
    expect(weeksInARow(sessions, TODAY, 3)).toBe(1);
  });

  it('is zero with nothing recorded', () => {
    expect(weeksInARow([], TODAY, 3)).toBe(0);
  });
});
