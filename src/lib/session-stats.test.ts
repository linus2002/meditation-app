import { describe, expect, it } from 'vitest';

import {
  currentStreak,
  formatHoursMinutes,
  lifetimeTotals,
  recentDays,
  sessionsOn,
  summariseDay,
  weeklyMinutes,
} from '@/lib/session-stats';
import type { SessionRecord } from '@/types';

const TODAY = new Date(2026, 8, 9); // Wed 9 Sep 2026
const GOAL = 30;

let counter = 0;
const sit = (date: string, minutes: number, startedAt = 0): SessionRecord => ({
  id: `s${counter++}`,
  meditationId: 'morning-clarity',
  date,
  seconds: minutes * 60,
  completed: true,
  startedAt,
});

describe('formatHoursMinutes', () => {
  it('pads to HH:MM', () => {
    expect(formatHoursMinutes(4500)).toBe('01:15');
    expect(formatHoursMinutes(0)).toBe('00:00');
  });

  it('does not go negative on bad input', () => {
    expect(formatHoursMinutes(-60)).toBe('00:00');
  });

  it('keeps counting past a day rather than wrapping', () => {
    expect(formatHoursMinutes(25 * 3600)).toBe('25:00');
  });
});

describe('sessionsOn', () => {
  it('picks out only that local calendar day', () => {
    const sessions = [sit('2026-09-09', 10), sit('2026-09-08', 10)];
    expect(sessionsOn(sessions, '2026-09-09')).toHaveLength(1);
  });
});

describe('summariseDay', () => {
  it('adds up every sitting on the day', () => {
    const day = summariseDay([sit('2026-09-09', 10), sit('2026-09-09', 20)], '2026-09-09', GOAL);
    expect(day.minutes).toBe(30);
    expect(day.sessions).toBe(2);
  });

  it('caps completion at 1 when the goal is beaten', () => {
    const day = summariseDay([sit('2026-09-09', 90)], '2026-09-09', GOAL);
    expect(day.completion).toBe(1);
  });

  it('reports an empty day without inventing anything', () => {
    const day = summariseDay([], '2026-09-09', GOAL);
    expect(day.minutes).toBe(0);
    expect(day.sessions).toBe(0);
    expect(day.completion).toBe(0);
    expect(day.firstSitAt).toBeNull();
  });

  it('takes the earliest start as the first sit, whatever order they arrive in', () => {
    const late = sit('2026-09-09', 10, new Date(2026, 8, 9, 19, 30).getTime());
    const early = sit('2026-09-09', 10, new Date(2026, 8, 9, 7, 12).getTime());
    expect(summariseDay([late, early], '2026-09-09', GOAL).firstSitAt).toBe('07:12');
  });

  it('does not divide by zero when there is no goal', () => {
    expect(summariseDay([sit('2026-09-09', 10)], '2026-09-09', 0).completion).toBe(0);
  });
});

describe('currentStreak', () => {
  it('is zero with nothing recorded', () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const sessions = [sit('2026-09-09', 10), sit('2026-09-08', 10), sit('2026-09-07', 10)];
    expect(currentStreak(sessions, TODAY)).toBe(3);
  });

  /*
   * The documented kindness in this function: a streak that reset at midnight,
   * before the reader has had any chance to sit, would just be a nag.
   */
  it('survives a today with nothing in it yet', () => {
    const sessions = [sit('2026-09-08', 10), sit('2026-09-07', 10)];
    expect(currentStreak(sessions, TODAY)).toBe(2);
  });

  it('is broken by a missed day, not bridged', () => {
    const sessions = [sit('2026-09-09', 10), sit('2026-09-07', 10)];
    expect(currentStreak(sessions, TODAY)).toBe(1);
  });

  it('is zero once two days have gone by', () => {
    expect(currentStreak([sit('2026-09-07', 10)], TODAY)).toBe(0);
  });

  it('counts a day once however many times you sat', () => {
    const sessions = [sit('2026-09-09', 10), sit('2026-09-09', 10), sit('2026-09-08', 10)];
    expect(currentStreak(sessions, TODAY)).toBe(2);
  });
});

describe('lifetimeTotals', () => {
  it('sums minutes and counts sittings', () => {
    expect(lifetimeTotals([sit('2026-09-09', 10), sit('2026-01-01', 20)])).toEqual({
      minutes: 30,
      sessions: 2,
    });
  });

  it('is zero for a fresh install', () => {
    expect(lifetimeTotals([])).toEqual({ minutes: 0, sessions: 0 });
  });
});

describe('weeklyMinutes and recentDays', () => {
  it('always returns seven days, oldest first', () => {
    const week = weeklyMinutes([sit('2026-09-09', 10)], TODAY);
    expect(week).toHaveLength(7);
    expect(week[0].key).toBe('2026-09-03');
    expect(week[6].key).toBe('2026-09-09');
  });

  it('leaves untouched days at zero rather than omitting them', () => {
    const week = weeklyMinutes([sit('2026-09-09', 10)], TODAY);
    expect(week[6].minutes).toBe(10);
    expect(week[5].minutes).toBe(0);
  });

  it('ignores sessions outside the window', () => {
    const week = weeklyMinutes([sit('2026-01-01', 60)], TODAY);
    expect(week.every((day) => day.minutes === 0)).toBe(true);
  });

  it('recentDays returns the requested span, oldest first', () => {
    const days = recentDays([], TODAY, 5, GOAL);
    expect(days).toHaveLength(5);
    expect(days[0].date).toBe('2026-09-05');
    expect(days[4].date).toBe('2026-09-09');
  });
});
