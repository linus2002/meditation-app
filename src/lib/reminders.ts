/**
 * The two scheduled nudges, and the date maths behind them.
 *
 * Everything here is pure and clock-injected — `nextOccurrence(time, from)`
 * never reads `Date.now()` itself — so the scheduler can be tested without
 * waiting for 07:00 to come around.
 *
 * The times live here rather than in the settings copy, and `data/settings.ts`
 * reads them back out, so the toggle that promises "07:00" and the notification
 * that arrives cannot drift apart.
 */

export interface ReminderDefinition {
  /** Matches the id of the toggle in `settingToggles` that switches it on. */
  id: string;
  /** Local wall-clock time, `HH:MM`. */
  time: string;
  title: string;
  body: string;
  /** Where a tap on the notification should land. */
  url: string;
  /**
   * Stable small integer for the native scheduler, which keys notifications by
   * number. Never reuse or renumber one: the OS holds pending notifications
   * across app updates and would cancel the wrong reminder.
   */
  nativeId: number;
}

export const reminderDefinitions: ReminderDefinition[] = [
  {
    id: 'reminders',
    time: '07:00',
    title: 'Today is waiting',
    body: 'A few quiet minutes, whenever you are ready.',
    url: '/home',
    nativeId: 1,
  },
  {
    id: 'bedtime',
    time: '22:30',
    title: 'Time to wind down',
    body: 'Dim the lights and pick something for sleep.',
    url: '/sleep',
    nativeId: 2,
  },
];

export function getReminder(id: string): ReminderDefinition | undefined {
  return reminderDefinitions.find((entry) => entry.id === id);
}

/** `'07:00'` → `{ hours: 7, minutes: 0 }`. Null for anything malformed. */
export function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * The next moment that wall-clock time comes around, at or after `from`.
 *
 * A time that has already passed today rolls to tomorrow. The roll goes through
 * `setDate`, which keeps the wall-clock hour across a daylight-saving boundary —
 * a 07:00 reminder stays at 07:00 through the changeover rather than sliding to
 * 06:00 or 08:00 for half the year.
 */
export function nextOccurrence(time: string, from: Date): Date {
  const parsed = parseTime(time);
  if (!parsed) throw new Error(`Not a HH:MM time: ${time}`);

  const next = new Date(from);
  next.setHours(parsed.hours, parsed.minutes, 0, 0);
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1);

  return next;
}

/** Milliseconds from `from` until that time next comes around. */
export function msUntilNext(time: string, from: Date): number {
  return nextOccurrence(time, from).getTime() - from.getTime();
}

/**
 * How late a reminder may arrive and still be worth showing, in milliseconds.
 *
 * The web scheduler only runs while the app is open, so it can find itself
 * starting up long after a reminder was due. Delivering "time to wind down" at
 * nine the next morning is worse than staying quiet, so anything outside this
 * window is dropped rather than fired late.
 */
export const LATE_DELIVERY_LIMIT_MS = 30 * 60 * 1000;

/** Local calendar date, `YYYY-MM-DD` — the key a fired reminder is stamped with. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Whether a reminder is due right now: its time has passed today, it has not
 * already been delivered today, and it is not so late that it should be skipped.
 */
export function isDue(
  reminder: ReminderDefinition,
  now: Date,
  lastDelivered: string | undefined,
): boolean {
  const parsed = parseTime(reminder.time);
  if (!parsed) return false;

  const dueAt = new Date(now);
  dueAt.setHours(parsed.hours, parsed.minutes, 0, 0);

  const elapsed = now.getTime() - dueAt.getTime();
  if (elapsed < 0 || elapsed > LATE_DELIVERY_LIMIT_MS) return false;

  return lastDelivered !== dayKey(now);
}
