/**
 * The client-side shape of Circles.
 *
 * These mirror the Supabase tables (see `supabase/migrations/`) but are camel-
 * cased and carry one derived field, `durationSeconds`, looked up from the
 * session catalogue so the schedule knows when a sitting ends.
 */

export type CircleGoal = 'calm' | 'sleep' | 'focus' | 'habit';
export type TimeBand = 'morning' | 'midday' | 'evening' | 'night';
export type CircleLevel = 'all' | 'new' | 'experienced';
export type CircleStatus = 'open' | 'closed' | 'merged';
export type MemberRole = 'member' | 'anchor';

/** How the reader describes their own practice at intake. */
export type ExperienceLevel = 'new' | 'some' | 'regular';

export interface Circle {
  id: string;
  slug: string;
  name: string;
  description: string;
  goal: CircleGoal;
  timeBand: TimeBand;
  level: CircleLevel;
  /** IANA zone the session time is written in, e.g. `Europe/London`. */
  tz: string;
  /** Wall-clock `HH:MM` in `tz`. */
  sessionTime: string;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  sessionDays: number[];
  /** Id from `src/data/meditations.ts`. */
  meditationId: string;
  /** Length of that meditation — derived, not stored on the circle. */
  durationSeconds: number;
  capacity: number;
  memberCount: number;
  status: CircleStatus;
}

/** Intake answers. Kept on the device; never sent to the server. */
export interface Intake {
  goal: CircleGoal;
  time: TimeBand;
  experience: ExperienceLevel;
}

/** What the schedule needs to know about a circle. */
export interface CircleSchedule {
  tz: string;
  sessionTime: string;
  sessionDays: number[];
  durationSeconds: number;
}

/** One sitting of a circle's recurring session. Times are epoch milliseconds. */
export interface Occurrence {
  startsAt: number;
  endsAt: number;
  /** The circle-local calendar date it belongs to, `YYYY-MM-DD`. */
  dateKey: string;
}

export type LivePhase = 'upcoming' | 'lobby' | 'live' | 'closing' | 'ended';
