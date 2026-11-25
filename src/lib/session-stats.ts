import {
  addDays,
  dayOfMonth,
  fromDateKey,
  lastNDayKeys,
  startOfWeek,
  toDateKey,
  weekdayInitial,
} from '@/lib/date';
import type { DaySummary, SessionRecord } from '@/types';

/** Seconds -> "01:15". Hours and minutes, matching the clock figures. */
export function formatHoursMinutes(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Epoch ms -> "07:12" in local time. */
function clockAt(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function sessionsOn(sessions: SessionRecord[], dateKey: string): SessionRecord[] {
  return sessions.filter((session) => session.date === dateKey);
}

/**
 * Everything the activities screen needs for one day, derived from the
 * recorded sessions rather than stored separately — so it can never drift.
 */
export function summariseDay(
  sessions: SessionRecord[],
  dateKey: string,
  goalMinutes: number,
): DaySummary {
  const onDay = sessionsOn(sessions, dateKey);
  const seconds = onDay.reduce((total, session) => total + session.seconds, 0);
  const minutes = Math.round(seconds / 60);
  const firstStart = onDay.length > 0 ? Math.min(...onDay.map((s) => s.startedAt)) : null;

  return {
    date: dateKey,
    day: dayOfMonth(dateKey),
    seconds,
    minutes,
    goalMinutes,
    sessions: onDay.length,
    completion: goalMinutes > 0 ? Math.min(1, minutes / goalMinutes) : 0,
    firstSitAt: firstStart === null ? null : clockAt(firstStart),
    totalTime: formatHoursMinutes(seconds),
  };
}

/** The `count` most recent days, oldest first. */
export function recentDays(
  sessions: SessionRecord[],
  today: Date,
  count: number,
  goalMinutes: number,
): DaySummary[] {
  return lastNDayKeys(today, count).map((key) => summariseDay(sessions, key, goalMinutes));
}

/** Missed days a week that a streak carries over without breaking. */
export const REST_DAYS_PER_WEEK = 1;

export interface StreakDetail {
  /** Days sat in the current run. Rest days hold it; they don't add to it. */
  days: number;
  /** The missed days the run was carried over, newest first. */
  restDays: string[];
  /** Whether this week's rest day is still unused. */
  restLeftThisWeek: boolean;
}

/**
 * The current run of days sat, made gentle in two ways.
 *
 * Today never breaks it: a streak that resets at midnight, before you have had
 * a chance to sit, would just be a nag. And one missed day a week (Monday to
 * Sunday) is taken as a rest day, so a single busy day doesn't wipe out weeks
 * of practice. A second miss in the same week ends the run.
 *
 * Derived from the sittings alone, so there is nothing stored to drift.
 */
export function streakDetail(sessions: SessionRecord[], today: Date): StreakDetail {
  const thisWeek = toDateKey(startOfWeek(today));
  const restsIn = (week: string, used: string[]) =>
    used.filter((day) => toDateKey(startOfWeek(fromDateKey(day))) === week).length;

  if (sessions.length === 0) return { days: 0, restDays: [], restLeftThisWeek: true };

  const sat = new Set(sessions.map((session) => session.date));
  const first = [...sat].sort()[0];
  const restDays: string[] = [];
  let days = 0;
  let oldestSat: string | null = null;

  // Today only counts once it has a sitting in it.
  let cursor = sat.has(toDateKey(today)) ? today : addDays(today, -1);
  while (toDateKey(cursor) >= first) {
    const key = toDateKey(cursor);
    if (sat.has(key)) {
      days += 1;
      oldestSat = key;
    } else {
      const week = toDateKey(startOfWeek(cursor));
      if (restsIn(week, restDays) >= REST_DAYS_PER_WEEK) break;
      restDays.push(key);
    }
    cursor = addDays(cursor, -1);
  }

  // Rest days only count when they bridge to a day sat; trailing ones at the
  // far end of the run bridged nothing.
  const bridging = oldestSat === null ? [] : restDays.filter((day) => day > (oldestSat as string));

  return {
    days,
    restDays: bridging,
    restLeftThisWeek: restsIn(thisWeek, bridging) < REST_DAYS_PER_WEEK,
  };
}

/** Days in the current run; see `streakDetail` for how rest days work. */
export function currentStreak(sessions: SessionRecord[], today: Date): number {
  return streakDetail(sessions, today).days;
}

/** The days-a-week goal until the reader picks one. */
export const WEEKLY_GOAL_DAYS = 3;
export const WEEKLY_GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface WeekProgress {
  /** Monday of this week. */
  start: string;
  /** Monday to Sunday: whether each day has a sitting, and whether it's still ahead. */
  days: { key: string; label: string; sat: boolean; future: boolean }[];
  daysSat: number;
  goal: number;
  met: boolean;
}

/** This week, Monday to Sunday, against the days-a-week goal. */
export function weekProgress(sessions: SessionRecord[], today: Date, goal: number): WeekProgress {
  const monday = startOfWeek(today);
  const todayKey = toDateKey(today);
  const sat = new Set(sessions.map((session) => session.date));
  const days = Array.from({ length: 7 }, (_, index) => {
    const key = toDateKey(addDays(monday, index));
    return { key, label: weekdayInitial(key), sat: sat.has(key), future: key > todayKey };
  });
  const daysSat = days.filter((day) => day.sat).length;
  return { start: toDateKey(monday), days, daysSat, goal, met: daysSat >= goal };
}

/** "2 of 3 days this week", or "4 days this week" once past the goal. */
export function weekLine(week: Pick<WeekProgress, 'daysSat' | 'goal'>): string {
  const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
  return week.daysSat > week.goal
    ? `${days(week.daysSat)} this week`
    : `${week.daysSat} of ${days(week.goal)} this week`;
}

/**
 * Weeks in a row the goal was met. This week joins the count once it is met;
 * until then the run is counted from last week, so it isn't lost on a Monday.
 */
export function weeksInARow(sessions: SessionRecord[], today: Date, goal: number): number {
  if (sessions.length === 0) return 0;
  const first = [...sessions.map((session) => session.date)].sort()[0];
  const daysIn = (monday: Date) => {
    const start = toDateKey(monday);
    const end = toDateKey(addDays(monday, 6));
    return new Set(sessions.filter((s) => s.date >= start && s.date <= end).map((s) => s.date)).size;
  };

  let monday = startOfWeek(today);
  if (daysIn(monday) < goal) monday = addDays(monday, -7);
  let weeks = 0;
  while (toDateKey(addDays(monday, 6)) >= first && daysIn(monday) >= goal) {
    weeks += 1;
    monday = addDays(monday, -7);
  }
  return weeks;
}

export function lifetimeTotals(sessions: SessionRecord[]): {
  minutes: number;
  sessions: number;
} {
  const seconds = sessions.reduce((total, session) => total + session.seconds, 0);
  return { minutes: Math.round(seconds / 60), sessions: sessions.length };
}

/** The date of the first recorded sitting, or null before there is one. */
export function firstSessionDate(sessions: SessionRecord[]): Date | null {
  if (sessions.length === 0) return null;
  return new Date(Math.min(...sessions.map((session) => session.startedAt)));
}

/** Last seven days for the profile bar chart, oldest first. */
export function weeklyMinutes(
  sessions: SessionRecord[],
  today: Date,
): { key: string; label: string; minutes: number }[] {
  return lastNDayKeys(today, 7).map((key) => ({
    key,
    label: weekdayInitial(key),
    minutes: Math.round(sessionsOn(sessions, key).reduce((t, s) => t + s.seconds, 0) / 60),
  }));
}
