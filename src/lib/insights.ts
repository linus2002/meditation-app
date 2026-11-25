import { addDays, fromDateKey, startOfWeek, toDateKey } from '@/lib/date';
import { moodOfDay, moodShift, type MoodShift } from '@/lib/moods';
import type { MoodEntry, SessionRecord, SleepLog } from '@/types';

/** A comparison needs at least this many nights or sittings on each side. */
export const MIN_SAMPLE = 3;

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'in the morning',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
  night: 'at night',
};

export function timeOfDay(timestamp: number): TimeOfDay {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** `YYYY-MM` for a date key or a Date. */
export function monthKeyOf(value: string | Date): string {
  return (typeof value === 'string' ? value : toDateKey(value)).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(year, index - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Every day key of the month, the 1st first. */
export function daysOfMonth(month: string): string[] {
  const [year, index] = month.split('-').map(Number);
  const count = new Date(year, index, 0).getDate();
  return Array.from({ length: count }, (_, day) => `${month}-${String(day + 1).padStart(2, '0')}`);
}

export function monthName(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export interface SleepComparison {
  /** Average 1-5 rested score after a day with a sitting, and after one without. */
  withPractice: number;
  without: number;
  nightsWith: number;
  nightsWithout: number;
}

export interface MonthInsights {
  month: string;
  sessions: number;
  seconds: number;
  daysSat: number;
  /** The same figures a month earlier, for "up from …". */
  previous: { sessions: number; seconds: number };
  /** The most-sat session, by how often, then how long. Null under two sittings. */
  favourite: { meditationId: string; count: number } | null;
  /** When most sittings happened, once there are enough to say. */
  usualTime: TimeOfDay | null;
  longestSeconds: number;
  /** Days of the month, with the mood and minutes of each. */
  days: { key: string; mood: number | null; minutes: number; future: boolean }[];
  averageMood: number | null;
  moodDays: number;
  shift: MoodShift;
  /** Null until there are enough nights on both sides to compare. */
  sleep: SleepComparison | null;
  /** Weeks (by their Monday) in this month that are over or under way, and how many met the goal. */
  weeks: { total: number; met: number };
}

interface InsightInput {
  sessions: SessionRecord[];
  moods: MoodEntry[];
  sleepLogs: SleepLog[];
  weeklyGoalDays: number;
}

function totals(sessions: SessionRecord[], month: string) {
  const inMonth = sessions.filter((session) => session.date.startsWith(month));
  return {
    list: inMonth,
    sessions: inMonth.length,
    seconds: inMonth.reduce((total, session) => total + session.seconds, 0),
  };
}

/**
 * Sleep after days you sat against sleep after days you didn't. A night is
 * keyed by the morning you woke, so it follows the day before.
 */
export function compareSleep(sessions: SessionRecord[], logs: SleepLog[], month: string): SleepComparison | null {
  const sat = new Set(sessions.map((session) => session.date));
  const withPractice: number[] = [];
  const without: number[] = [];
  for (const log of logs) {
    if (!log.date.startsWith(month)) continue;
    const dayBefore = toDateKey(addDays(fromDateKey(log.date), -1));
    (sat.has(dayBefore) ? withPractice : without).push(log.quality);
  }
  if (withPractice.length < MIN_SAMPLE || without.length < MIN_SAMPLE) return null;
  const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  return {
    withPractice: mean(withPractice),
    without: mean(without),
    nightsWith: withPractice.length,
    nightsWithout: without.length,
  };
}

/** Everything the monthly insights screen says, derived from what was recorded. */
export function monthInsights(input: InsightInput, month: string, today: Date): MonthInsights {
  const { sessions, moods, sleepLogs, weeklyGoalDays } = input;
  const current = totals(sessions, month);
  const previous = totals(sessions, shiftMonth(month, -1));
  const todayKey = toDateKey(today);

  const counts = new Map<string, { count: number; seconds: number }>();
  for (const session of current.list) {
    const entry = counts.get(session.meditationId) ?? { count: 0, seconds: 0 };
    counts.set(session.meditationId, { count: entry.count + 1, seconds: entry.seconds + session.seconds });
  }
  const top = [...counts.entries()].sort((a, b) => b[1].count - a[1].count || b[1].seconds - a[1].seconds)[0];

  const times = new Map<TimeOfDay, number>();
  for (const session of current.list) {
    const slot = timeOfDay(session.startedAt);
    times.set(slot, (times.get(slot) ?? 0) + 1);
  }
  const usual = [...times.entries()].sort((a, b) => b[1] - a[1])[0];

  const days = daysOfMonth(month).map((key) => ({
    key,
    mood: moodOfDay(moods, key),
    minutes: Math.round(current.list.filter((session) => session.date === key).reduce((t, s) => t + s.seconds, 0) / 60),
    future: key > todayKey,
  }));
  const moodValues = days.map((day) => day.mood).filter((mood): mood is number => mood !== null);

  // Weeks belong to the month their Monday falls in; one not yet begun doesn't count.
  let weekTotal = 0;
  let weekMet = 0;
  const sat = new Set(sessions.map((session) => session.date));
  for (const key of daysOfMonth(month)) {
    const date = fromDateKey(key);
    if (toDateKey(startOfWeek(date)) !== key || key > todayKey) continue;
    weekTotal += 1;
    const daysSat = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(date, index))).filter((day) =>
      sat.has(day),
    ).length;
    if (daysSat >= weeklyGoalDays) weekMet += 1;
  }

  return {
    month,
    sessions: current.sessions,
    seconds: current.seconds,
    daysSat: new Set(current.list.map((session) => session.date)).size,
    previous: { sessions: previous.sessions, seconds: previous.seconds },
    favourite: top && current.sessions >= 2 ? { meditationId: top[0], count: top[1].count } : null,
    usualTime: usual && current.sessions >= MIN_SAMPLE ? usual[0] : null,
    longestSeconds: current.list.reduce((longest, session) => Math.max(longest, session.seconds), 0),
    days,
    averageMood: moodValues.length ? moodValues.reduce((t, v) => t + v, 0) / moodValues.length : null,
    moodDays: moodValues.length,
    shift: moodShift(moods, (entry) => entry.date.startsWith(month)),
    sleep: compareSleep(sessions, sleepLogs, month),
    weeks: { total: weekTotal, met: weekMet },
  };
}

/** "3h 20m", "45m", "0m". */
export function formatTotal(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "+0.8", "−1.2", "0" — the change on the five-point scale, one decimal. */
export function formatShift(value: number): string {
  // Rounded the same way either side of zero: −1.25 is −1.3, as +1.25 is +1.3.
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10;
  if (rounded === 0) return '0';
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`;
}
