/**
 * Everything here works in the device's local calendar, not UTC. A session at
 * 11pm should count for that day, not tomorrow.
 */

/** `YYYY-MM-DD` for the given date, in local time. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` back into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The `count` most recent day keys, oldest first, ending on `end`. */
export function lastNDayKeys(end: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    toDateKey(addDays(end, index - (count - 1))),
  );
}

/** e.g. "September, 2026" — matches the eyebrow on the activities screen. */
export function monthLabel(key: string): string {
  const date = fromDateKey(key);
  return `${date.toLocaleDateString(undefined, { month: 'long' })}, ${date.getFullYear()}`;
}

/** Day-of-month number, for the date strip. */
export function dayOfMonth(key: string): number {
  return fromDateKey(key).getDate();
}

/** Single-letter weekday, for the profile chart. */
export function weekdayInitial(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'narrow' });
}

/** "Today", "Yesterday", or e.g. "Mon 8 Sep". */
export function relativeDayLabel(key: string, today = new Date()): string {
  if (key === toDateKey(today)) return 'Today';
  if (key === toDateKey(addDays(today, -1))) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
