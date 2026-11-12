import { parseTime } from '@/lib/reminders';

/**
 * Time-zone arithmetic for circles, with no dependency beyond `Intl`.
 *
 * A circle meets at a wall-clock time in its own zone — 07:00 in London — and
 * its members may be anywhere. Everything the rest of the app needs reduces to
 * two questions: "what instant is 07:00 in London on this date?" and "what
 * date and time is this instant in that zone?". Both are answered here, and
 * both hold across daylight-saving changes.
 *
 * `lib/date.ts` and `nextOccurrence` in `lib/reminders.ts` deliberately work in
 * the device's own zone; they cannot answer either question.
 */

const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let formatter = formatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, formatter);
  }
  return formatter;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(epochMs: number, tz: string): ZonedParts {
  const parts = formatterFor(tz).formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  // Some engines still write midnight as "24" despite `h23`.
  const hour = get('hour');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone's offset from UTC at that instant, in minutes (London summer: 60). */
export function offsetMinutes(epochMs: number, tz: string): number {
  const p = zonedParts(epochMs, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(epochMs / 1000) * 1000) / 60_000);
}

/** The calendar date of that instant in the zone, `YYYY-MM-DD`. */
export function dateKeyInZone(epochMs: number, tz: string): string {
  const p = zonedParts(epochMs, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The wall-clock time of that instant in the zone, 24-hour `HH:MM`. */
export function wallTimeInZone(epochMs: number, tz: string): string {
  const p = zonedParts(epochMs, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * The instant a wall-clock time happens on a date in a zone.
 *
 * The offset is tried from either side of the date, which is enough because
 * no real zone changes twice within two days. Across the autumn change a time
 * happens twice and the earlier one is returned; across the spring change it
 * never happens and the result moves forward by the gap — 01:30 on the day
 * London skips to 02:00 becomes 02:30 — so a session is late, never lost.
 */
export function zonedTimeToUtc(dateKey: string, time: string, tz: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsed = parseTime(time);
  if (!parsed) throw new Error(`Not a HH:MM time: ${time}`);

  const wallAsUtc = Date.UTC(year, month - 1, day, parsed.hours, parsed.minutes);
  const before = offsetMinutes(wallAsUtc - DAY_MS, tz);
  const after = offsetMinutes(wallAsUtc + DAY_MS, tz);

  const valid = [...new Set([before, after])]
    .map((offset) => wallAsUtc - offset * 60_000)
    .filter((instant) => offsetMinutes(instant, tz) * 60_000 === wallAsUtc - instant);

  if (valid.length > 0) return Math.min(...valid);
  return wallAsUtc - before * 60_000;
}

/** `YYYY-MM-DD` shifted by whole days, with no zone involved. */
export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** ISO weekday of a calendar date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** The device's own zone, falling back to UTC where it cannot be read. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
