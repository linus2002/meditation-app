import { addDaysToKey } from '@/lib/circles/tz';

/**
 * The circle's streak — the group's, never anyone's own.
 *
 * A day counts once `quorumFor(members)` different members have sat. The
 * server latches that day the moment the quorum is reached (`circle_days`), so
 * a day that counted can never stop counting because someone later left. This
 * file only counts the run of latched days.
 *
 * Keep `CIRCLE_DAY_QUORUM` in step with `latch_circle_day` in the migrations.
 */
export const CIRCLE_DAY_QUORUM = 3;

/**
 * Members needed for a day to count: three, or everyone in a circle smaller
 * than three — so the first person in a new circle can honestly start it.
 */
export function quorumFor(memberCount: number): number {
  return Math.max(1, Math.min(CIRCLE_DAY_QUORUM, memberCount));
}

/** How many more sits today needs. Zero once it counts. */
export function neededToday(sittersToday: number, memberCount: number): number {
  return Math.max(0, quorumFor(memberCount) - sittersToday);
}

/**
 * Consecutive counted days ending today — or yesterday, while today has not
 * counted yet. Same forgiving rule as `currentStreak` in `lib/session-stats.ts`:
 * a streak that resets at midnight, before anyone has had a chance to sit, is
 * just a nag.
 */
export function groupStreak(metDates: string[], todayKey: string): number {
  const days = new Set(metDates);
  let cursor = todayKey;

  if (!days.has(cursor)) {
    cursor = addDaysToKey(cursor, -1);
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}
