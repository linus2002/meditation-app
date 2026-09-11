import { parseTime } from '@/lib/reminders';
import { currentOrNextOccurrence } from '@/lib/circles/schedule';
import { wallTimeInZone } from '@/lib/circles/tz';
import type { Circle, Intake, TimeBand } from '@/lib/circles/types';

/**
 * Turning three intake answers into two or three circles worth choosing from.
 *
 * Time of day matters most: a circle that meets when you are asleep is no
 * circle at all, however well its goal fits. Goal comes next, then a light
 * nudge for experience, then a small pull towards circles that already have
 * people in them, so early members gather instead of each sitting alone in an
 * empty circle.
 *
 * The score is never shown. The reader sees the reasons behind it.
 */

const BANDS: TimeBand[] = ['morning', 'midday', 'evening', 'night'];

const SCORE = {
  sameBand: 40,
  adjacentBand: 15,
  goal: 30,
  habitFallback: 10,
  level: 5,
  beginnerLength: 5,
  gatheringMax: 10,
} as const;

/** Sessions this short or shorter are gentle enough to suggest to beginners. */
const BEGINNER_MAX_SECONDS = 12 * 60;

/** Membership beyond this adds nothing more to the gathering pull. */
const GATHERING_SATURATION = 15;

export type MatchReason = 'time' | 'near-time' | 'goal' | 'beginner-friendly' | 'gathering';

export interface Recommendation {
  circle: Circle;
  score: number;
  reasons: MatchReason[];
  /** When it next meets, epoch ms. */
  startsAt: number;
  /** That start in the reader's own zone, `HH:MM`. */
  localTime: string;
}

/** 05–11 morning, 11–16 midday, 16–21 evening, 21–05 night. */
export function timeBandOf(time: string): TimeBand {
  const parsed = parseTime(time);
  if (!parsed) throw new Error(`Not a HH:MM time: ${time}`);
  const { hours } = parsed;
  if (hours >= 5 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 16) return 'midday';
  if (hours >= 16 && hours < 21) return 'evening';
  return 'night';
}

/** Steps between two bands on the clock face — night sits next to morning. */
function bandDistance(a: TimeBand, b: TimeBand): number {
  const distance = Math.abs(BANDS.indexOf(a) - BANDS.indexOf(b));
  return Math.min(distance, BANDS.length - distance);
}

/** 23:00–04:59: never suggested unless the reader asked for night. */
export function isSleepingHour(time: string): boolean {
  const parsed = parseTime(time);
  if (!parsed) return false;
  return parsed.hours >= 23 || parsed.hours < 5;
}

function levelFits(circle: Circle, intake: Intake): boolean {
  if (circle.level === 'all') return true;
  if (circle.level === 'new') return intake.experience === 'new';
  return intake.experience === 'regular';
}

export function recommendCircles({
  intake,
  userTz,
  now,
  circles,
  joinedIds = [],
  limit = 3,
}: {
  intake: Intake;
  userTz: string;
  now: number;
  circles: Circle[];
  joinedIds?: string[];
  limit?: number;
}): Recommendation[] {
  const joined = new Set(joinedIds);
  const results: Recommendation[] = [];

  for (const circle of circles) {
    if (circle.status !== 'open') continue;
    if (circle.memberCount >= circle.capacity) continue;
    if (joined.has(circle.id)) continue;

    const occurrence = currentOrNextOccurrence(circle, now);
    if (!occurrence) continue;

    const localTime = wallTimeInZone(occurrence.startsAt, userTz);
    if (intake.time !== 'night' && isSleepingHour(localTime)) continue;

    let score = 0;
    const reasons: MatchReason[] = [];

    const distance = bandDistance(timeBandOf(localTime), intake.time);
    if (distance === 0) {
      score += SCORE.sameBand;
      reasons.push('time');
    } else if (distance === 1) {
      score += SCORE.adjacentBand;
      reasons.push('near-time');
    }

    if (circle.goal === intake.goal) {
      score += SCORE.goal;
      reasons.push('goal');
    } else if (circle.goal === 'habit') {
      score += SCORE.habitFallback;
    }

    if (levelFits(circle, intake)) score += SCORE.level;

    if (intake.experience === 'new' && circle.durationSeconds <= BEGINNER_MAX_SECONDS) {
      score += SCORE.beginnerLength;
      reasons.push('beginner-friendly');
    }

    if (circle.memberCount > 0) {
      score +=
        (SCORE.gatheringMax * Math.min(circle.memberCount, GATHERING_SATURATION)) /
        GATHERING_SATURATION;
      reasons.push('gathering');
    }

    results.push({ circle, score, reasons, startsAt: occurrence.startsAt, localTime });
  }

  return results
    .sort((a, b) => b.score - a.score || a.circle.slug.localeCompare(b.circle.slug))
    .slice(0, limit);
}
