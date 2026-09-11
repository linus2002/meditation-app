import { parseTime } from '@/lib/reminders';
import { addDaysToKey, dateKeyInZone, isoWeekday, zonedTimeToUtc } from '@/lib/circles/tz';
import type { CircleSchedule, LivePhase, Occurrence } from '@/lib/circles/types';

/**
 * When a circle sits, and what stage a sitting is at.
 *
 * "Synced" means a shared wall-clock window, not a shared audio stream: the
 * session starts at the same instant for everyone, and anyone who arrives late
 * starts at the same point as the people already there. Every function takes
 * `now` as an argument, so all of it is testable without waiting for 07:00.
 */

const DAY_MS = 86_400_000;

/** The room opens this long before the start, so people can gather. */
export const LOBBY_OPENS_MS = 5 * 60 * 1000;

/**
 * Joining closes once this share of the session has passed. Arriving for the
 * last minutes of a sitting is more disruptive than helpful; past this point
 * the circle page offers a solo sit instead, which still counts for the circle.
 */
export const JOIN_WINDOW_FRACTION = 0.5;

/** How far ahead of the start the reminder arrives. */
export const CIRCLE_REMINDER_LEAD_MS = 10 * 60 * 1000;

/** The sitting on a circle-local date, or null if the circle does not meet that day. */
export function occurrenceOn(schedule: CircleSchedule, dateKey: string): Occurrence | null {
  if (!schedule.sessionDays.includes(isoWeekday(dateKey))) return null;
  if (!parseTime(schedule.sessionTime)) return null;

  const startsAt = zonedTimeToUtc(dateKey, schedule.sessionTime, schedule.tz);
  return { startsAt, endsAt: startsAt + schedule.durationSeconds * 1000, dateKey };
}

/**
 * The sitting that is under way, or the next one to come.
 *
 * Starts from yesterday so that a late session still running past midnight —
 * 23:50 for twenty minutes — is found as the current one, not skipped.
 */
export function currentOrNextOccurrence(
  schedule: CircleSchedule,
  now: number,
): Occurrence | null {
  const today = dateKeyInZone(now, schedule.tz);
  for (let offset = -1; offset <= 7; offset += 1) {
    const occurrence = occurrenceOn(schedule, addDaysToKey(today, offset));
    if (occurrence && occurrence.endsAt > now) return occurrence;
  }
  return null;
}

/** Every sitting that starts after `now` and within the next `days` days. */
export function upcomingOccurrences(
  schedule: CircleSchedule,
  now: number,
  days: number,
): Occurrence[] {
  const today = dateKeyInZone(now, schedule.tz);
  const horizon = now + days * DAY_MS;
  const found: Occurrence[] = [];

  for (let offset = 0; offset <= days; offset += 1) {
    const occurrence = occurrenceOn(schedule, addDaysToKey(today, offset));
    if (occurrence && occurrence.startsAt > now && occurrence.startsAt <= horizon) {
      found.push(occurrence);
    }
  }
  return found;
}

export function livePhase(occurrence: Occurrence, now: number): LivePhase {
  const { startsAt, endsAt } = occurrence;
  const joinCloses = startsAt + (endsAt - startsAt) * JOIN_WINDOW_FRACTION;

  if (now < startsAt - LOBBY_OPENS_MS) return 'upcoming';
  if (now < startsAt) return 'lobby';
  if (now < joinCloses) return 'live';
  if (now < endsAt) return 'closing';
  return 'ended';
}

export function canJoin(phase: LivePhase): boolean {
  return phase === 'lobby' || phase === 'live';
}

/** Where in the session someone arriving now should start, in seconds. */
export function joinOffsetSeconds(occurrence: Occurrence, now: number): number {
  const duration = (occurrence.endsAt - occurrence.startsAt) / 1000;
  return Math.min(duration, Math.max(0, (now - occurrence.startsAt) / 1000));
}

/** Stamp recorded once a reminder for this sitting has been shown. */
export function reminderKey(circleId: string, occurrence: Occurrence): string {
  return `${circleId}:${new Date(occurrence.startsAt).toISOString()}`;
}

/**
 * Whether the pre-session reminder should be shown now.
 *
 * Only in the ten minutes before the start. Once the session has begun the
 * moment has passed — a "starting soon" that arrives late is worse than none.
 */
export function circleReminderDue(
  occurrence: Occurrence,
  now: number,
  alreadyDelivered: boolean,
): boolean {
  if (alreadyDelivered) return false;
  return now >= occurrence.startsAt - CIRCLE_REMINDER_LEAD_MS && now < occurrence.startsAt;
}
