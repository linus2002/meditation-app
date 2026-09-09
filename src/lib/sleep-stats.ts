import { lastNDayKeys, weekdayInitial } from '@/lib/date';
import type { SleepLog, SleepNight } from '@/types';

const MINUTES_PER_DAY = 24 * 60;

/** "22:48" -> 1368. Returns null for anything that is not a local clock time. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 1368 -> "22:48". Wraps, so 25:00 reads as 01:00. */
export function formatClockMinutes(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Minutes asleep between two clock times.
 *
 * Bedtime is almost always on the previous calendar day, so a wake time that
 * looks earlier than the bedtime has simply crossed midnight and gets a day
 * added. A nap that starts and ends at the same minute counts as zero rather
 * than a full twenty-four hours.
 */
export function minutesAsleep(bedtime: string, wakeTime: string): number | null {
  const start = parseClock(bedtime);
  const end = parseClock(wakeTime);
  if (start === null || end === null) return null;
  if (start === end) return 0;
  return end > start ? end - start : end + MINUTES_PER_DAY - start;
}

export function hoursAsleep(log: SleepLog): number {
  return (minutesAsleep(log.bedtime, log.wakeTime) ?? 0) / 60;
}

/**
 * The mean of several clock times, taken around the circle.
 *
 * Averaging 23:40 and 00:20 arithmetically gives midday, which is the wrong
 * answer by twelve hours. Treating each time as an angle and averaging the
 * vectors gives midnight, which is the right one.
 */
export function averageClock(times: string[]): string | null {
  const minutes = times.map(parseClock).filter((value): value is number => value !== null);
  if (minutes.length === 0) return null;

  let x = 0;
  let y = 0;
  for (const value of minutes) {
    const angle = (value / MINUTES_PER_DAY) * 2 * Math.PI;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }

  // Every time cancelling out leaves no meaningful mean to report.
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return null;

  const mean = Math.atan2(y / minutes.length, x / minutes.length);
  return formatClockMinutes((mean / (2 * Math.PI)) * MINUTES_PER_DAY);
}

/**
 * The last `count` nights, oldest first, keyed by the morning you woke.
 *
 * Nights with no entry are still returned, marked `logged: false`, so the chart
 * shows a gap where nothing was recorded instead of quietly closing it up.
 */
export function recentNights(logs: SleepLog[], today: Date, count: number): SleepNight[] {
  const byDate = new Map(logs.map((log) => [log.date, log]));

  return lastNDayKeys(today, count).map((key) => {
    const log = byDate.get(key);
    return {
      key,
      label: weekdayInitial(key),
      hours: log ? hoursAsleep(log) : 0,
      // Stored 1-5, reported 0-1.
      quality: log ? (log.quality - 1) / 4 : 0,
      logged: Boolean(log),
    };
  });
}

export interface SleepSummary {
  /** How many of the requested nights actually have an entry. */
  nights: number;
  window: number;
  /** Null until at least one night is logged — never a stand-in figure. */
  averageHours: number | null;
  averageQuality: number | null;
  bedtime: string | null;
  wakeTime: string | null;
}

/** Averages over the logged nights in the window, ignoring the missing ones. */
export function summariseSleep(logs: SleepLog[], today: Date, window: number): SleepSummary {
  const keys = new Set(lastNDayKeys(today, window));
  const inWindow = logs.filter((log) => keys.has(log.date));

  if (inWindow.length === 0) {
    return {
      nights: 0,
      window,
      averageHours: null,
      averageQuality: null,
      bedtime: null,
      wakeTime: null,
    };
  }

  const totalHours = inWindow.reduce((sum, log) => sum + hoursAsleep(log), 0);
  const totalQuality = inWindow.reduce((sum, log) => sum + (log.quality - 1) / 4, 0);

  return {
    nights: inWindow.length,
    window,
    averageHours: totalHours / inWindow.length,
    averageQuality: totalQuality / inWindow.length,
    bedtime: averageClock(inWindow.map((log) => log.bedtime)),
    wakeTime: averageClock(inWindow.map((log) => log.wakeTime)),
  };
}
