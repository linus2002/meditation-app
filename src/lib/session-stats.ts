import { addDays, dayOfMonth, lastNDayKeys, toDateKey, weekdayInitial } from '@/lib/date';
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

/**
 * Consecutive days ending today. If nothing has been recorded yet today the
 * streak still counts from yesterday — a streak that resets at midnight, before
 * you have had a chance to sit, would just be a nag.
 */
export function currentStreak(sessions: SessionRecord[], today: Date): number {
  if (sessions.length === 0) return 0;

  const days = new Set(sessions.map((session) => session.date));
  let cursor = today;
  if (!days.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function lifetimeTotals(sessions: SessionRecord[]): {
  minutes: number;
  sessions: number;
} {
  const seconds = sessions.reduce((total, session) => total + session.seconds, 0);
  return { minutes: Math.round(seconds / 60), sessions: sessions.length };
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
