import { addDays, fromDateKey, toDateKey } from '@/lib/date';
import { LATE_DELIVERY_LIMIT_MS, parseTime } from '@/lib/reminders';

/**
 * Scheduled sessions: a meditation, story or yoga session the reader has set
 * for a date and time, once or on repeat, with a notification when it's due.
 *
 * Pure and clock-injected, like `lib/reminders`, so every rule here is tested
 * without waiting for the clock.
 */

export type ScheduleKind = 'meditation' | 'story' | 'yoga';
export type ScheduleRepeat = 'once' | 'daily' | 'weekdays' | 'weekly';

export interface ScheduledSession {
  id: string;
  kind: ScheduleKind;
  itemId: string;
  /** The first (or only) date, `YYYY-MM-DD`. Weekly repeats fall on this weekday. */
  date: string;
  /** Local wall-clock time, `HH:MM`. */
  time: string;
  repeat: ScheduleRepeat;
  createdAt: number;
}

export const MAX_SCHEDULES = 50;

/** Where tapping the notification (or "Start") takes the reader. */
export function scheduleUrl(entry: Pick<ScheduledSession, 'kind' | 'itemId'>): string {
  if (entry.kind === 'story') return `/stories/${entry.itemId}`;
  if (entry.kind === 'yoga') return `/yoga/${entry.itemId}`;
  return `/player/${entry.itemId}`;
}

const isWeekday = (date: Date) => date.getDay() >= 1 && date.getDay() <= 5;

/** Whether the schedule falls on a local date. */
export function occursOn(entry: ScheduledSession, dateKey: string): boolean {
  if (dateKey < entry.date) return false;
  switch (entry.repeat) {
    case 'once':
      return dateKey === entry.date;
    case 'daily':
      return true;
    case 'weekdays':
      return isWeekday(fromDateKey(dateKey));
    case 'weekly':
      return fromDateKey(dateKey).getDay() === fromDateKey(entry.date).getDay();
  }
}

/** The moment it falls on that date, in local time. */
export function occurrenceAt(entry: ScheduledSession, dateKey: string): Date {
  const at = fromDateKey(dateKey);
  const time = parseTime(entry.time) ?? { hours: 9, minutes: 0 };
  at.setHours(time.hours, time.minutes, 0, 0);
  return at;
}

/** Every schedule that falls on a date, earliest first. */
export function schedulesOn(entries: ScheduledSession[], dateKey: string): ScheduledSession[] {
  return entries.filter((entry) => occursOn(entry, dateKey)).sort((a, b) => a.time.localeCompare(b.time));
}

/** A once-only schedule whose moment has passed is finished, and can be tidied away. */
export function isFinished(entry: ScheduledSession, now: Date): boolean {
  return entry.repeat === 'once' && occurrenceAt(entry, entry.date).getTime() < now.getTime() - LATE_DELIVERY_LIMIT_MS;
}

/**
 * Whether a notification is due now: it falls today, its time has passed by
 * no more than the late-delivery limit, and it hasn't already been shown today.
 */
export function isScheduleDue(entry: ScheduledSession, now: Date, lastDelivered: string | undefined): boolean {
  const today = toDateKey(now);
  if (!occursOn(entry, today) || lastDelivered === today) return false;
  const elapsed = now.getTime() - occurrenceAt(entry, today).getTime();
  return elapsed >= 0 && elapsed <= LATE_DELIVERY_LIMIT_MS;
}

/**
 * The next moments these schedules fall, from `now` over `days` days, earliest
 * first and capped at `limit`. A phone holds only so many pending
 * notifications (iOS: 64 in all), so the nearest ones are what's handed over,
 * refreshed each time the app opens.
 */
export function upcomingOccurrences(
  entries: ScheduledSession[],
  now: Date,
  days: number,
  limit: number,
): { entry: ScheduledSession; at: Date }[] {
  const found: { entry: ScheduledSession; at: Date }[] = [];
  for (let offset = 0; offset < days; offset++) {
    const key = toDateKey(addDays(now, offset));
    for (const entry of entries) {
      if (!occursOn(entry, key)) continue;
      const at = occurrenceAt(entry, key);
      if (at.getTime() > now.getTime()) found.push({ entry, at });
    }
  }
  return found.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}

/** "Once", "Every day", "Weekdays", "Every Friday". */
export function repeatLabel(entry: Pick<ScheduledSession, 'repeat' | 'date'>): string {
  switch (entry.repeat) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'weekly':
      return `Every ${fromDateKey(entry.date).toLocaleDateString('en-US', { weekday: 'long' })}`;
  }
}

/** "07:30" → "7:30 AM". */
export function formatTime12(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  const suffix = parsed.hours >= 12 ? 'PM' : 'AM';
  const hours = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
  return `${hours}:${String(parsed.minutes).padStart(2, '0')} ${suffix}`;
}

/**
 * The weeks of a month for a calendar grid, Sunday first: date keys, with null
 * for the blank cells before the 1st and after the last day.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toDateKey(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Reads stored schedules defensively: anything malformed is dropped. */
export function parseSchedules(raw: string | null): ScheduledSession[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const kinds: ScheduleKind[] = ['meditation', 'story', 'yoga'];
    const repeats: ScheduleRepeat[] = ['once', 'daily', 'weekdays', 'weekly'];
    return data.filter((value): value is ScheduledSession => {
      const entry = value as Partial<ScheduledSession> | null;
      return (
        !!entry &&
        typeof entry.id === 'string' &&
        kinds.includes(entry.kind as ScheduleKind) &&
        typeof entry.itemId === 'string' &&
        typeof entry.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
        typeof entry.time === 'string' &&
        parseTime(entry.time) !== null &&
        repeats.includes(entry.repeat as ScheduleRepeat)
      );
    });
  } catch {
    return [];
  }
}
