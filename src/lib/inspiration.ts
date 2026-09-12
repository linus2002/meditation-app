import {
  dayNumber,
  inspirations,
  rotateByDate,
  type Inspiration,
  type InspirationTag,
} from '@/data/inspirations';
import { addDaysToKey } from '@/lib/circles/tz';
import { hoursAsleep } from '@/lib/sleep-stats';
import type { Reflection, SessionRecord, SleepLog } from '@/types';

/**
 * Choosing each reader's daily inspiration.
 *
 * Everything here runs on the phone, from data Serenity already keeps there.
 * Nothing about a reader's mood, sleep or habits is sent anywhere to pick a
 * message. All of it is pure and clock-injected, so it is tested directly.
 */

/** Themes a reader can ask for more of. */
export type InspirationTheme = 'calm' | 'sleep' | 'focus' | 'self-kindness';

export const inspirationThemes: { id: InspirationTheme; label: string }[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'focus', label: 'Focus' },
  { id: 'self-kindness', label: 'Self-kindness' },
];

/** The goal from the Circles questions, when the reader has answered them. */
export type InspirationGoal = 'calm' | 'sleep' | 'focus' | 'habit';

/** Why a message was chosen, shown as one quiet line under it. */
export type InspirationReason =
  | 'heavy-day'
  | 'rough-night'
  | 'welcome-back'
  | 'momentum'
  | 'theme'
  | 'goal';

export interface InspirationSignals {
  /** A reflection rated Heavy or Uneasy, today or yesterday. */
  heavyDay: boolean;
  /** Last night was logged as poor, or under six hours. */
  roughNight: boolean;
  /** Days since the last sit; null if there has never been one. */
  daysAway: number | null;
  /** Consecutive days with a sit, ending today or yesterday. */
  streak: number;
}

/** Rated 1-5 from Heavy to Light; 1 and 2 count as a heavy day. */
const HEAVY_WEIGHT = 2;
/** Rested 1-5; 1 and 2 count as a rough night. */
const ROUGH_QUALITY = 2;
const SHORT_NIGHT_HOURS = 6;
/** Away this long, a "welcome back" is kinder than a reminder to keep going. */
const WELCOME_BACK_DAYS = 4;
const MOMENTUM_STREAK = 3;

export function deriveSignals({
  todayKey,
  sessions,
  reflections,
  sleepLogs,
}: {
  todayKey: string;
  sessions: SessionRecord[];
  reflections: Reflection[];
  sleepLogs: SleepLog[];
}): InspirationSignals {
  const yesterdayKey = addDaysToKey(todayKey, -1);

  const heavyDay = reflections.some(
    (entry) =>
      (entry.date === todayKey || entry.date === yesterdayKey) && entry.weight <= HEAVY_WEIGHT,
  );

  // A night is keyed by the morning you woke, so last night is today's key.
  const lastNight = sleepLogs.find((log) => log.date === todayKey);
  const hours = lastNight ? hoursAsleep(lastNight) : 0;
  const roughNight = Boolean(
    lastNight && (lastNight.quality <= ROUGH_QUALITY || (hours > 0 && hours < SHORT_NIGHT_HOURS)),
  );

  const sitDays = new Set(sessions.map((session) => session.date));
  const latest = [...sitDays].sort().pop();
  const daysAway = latest ? Math.max(0, dayNumber(todayKey) - dayNumber(latest)) : null;

  let cursor = sitDays.has(todayKey) ? todayKey : yesterdayKey;
  let streak = 0;
  while (sitDays.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  return { heavyDay, roughNight, daysAway, streak };
}

const GOAL_TAG: Record<InspirationGoal, InspirationTag> = {
  calm: 'calm',
  sleep: 'sleep',
  focus: 'focus',
  habit: 'momentum',
};

interface TagWeight {
  weight: number;
  /** The reason behind the largest single contribution to this tag. */
  reason: InspirationReason;
  strongest: number;
}

/**
 * The message for a date, chosen for this reader.
 *
 * Each signal adds weight to the keywords that fit it; each message scores the
 * sum of its keywords' weights. The best matches — everything scoring at least
 * half the top score — then rotate by date, so the choice is stable all day
 * and changes the next, without cycling through only two or three messages.
 *
 * Passing moods only shape today and tomorrow: a rough night should not decide
 * the message ten days out. With nothing to go on, it falls back to the same
 * daily rotation everyone else sees.
 */
export function pickInspiration({
  dateKey,
  todayKey,
  signals,
  themes = [],
  goal,
  library = inspirations,
}: {
  dateKey: string;
  todayKey: string;
  signals: InspirationSignals;
  themes?: InspirationTheme[];
  goal?: InspirationGoal;
  library?: Inspiration[];
}): { inspiration: Inspiration; reason: InspirationReason | null } {
  const weights = new Map<InspirationTag, TagWeight>();
  const add = (tag: InspirationTag, weight: number, reason: InspirationReason) => {
    const current = weights.get(tag);
    const strongest = Math.max(current?.strongest ?? 0, weight);
    weights.set(tag, {
      weight: (current?.weight ?? 0) + weight,
      reason: current && current.strongest >= weight ? current.reason : reason,
      strongest,
    });
  };

  const ahead = dayNumber(dateKey) - dayNumber(todayKey);
  const soon = ahead >= 0 && ahead <= 1;

  if (soon && signals.heavyDay) {
    add('hard-day', 4, 'heavy-day');
    add('self-kindness', 2, 'heavy-day');
  }
  if (soon && signals.roughNight) {
    add('sleep', 4, 'rough-night');
    add('self-kindness', 1, 'rough-night');
  }
  if (soon && signals.daysAway !== null && signals.daysAway >= WELCOME_BACK_DAYS) {
    add('new-start', 4, 'welcome-back');
  }
  if (signals.streak >= MOMENTUM_STREAK) add('momentum', 2, 'momentum');
  for (const theme of themes) add(theme, 2, 'theme');
  if (goal) add(GOAL_TAG[goal], 1, 'goal');

  const scored = library.map((inspiration) => ({
    inspiration,
    score: inspiration.tags.reduce((sum, tag) => sum + (weights.get(tag)?.weight ?? 0), 0),
  }));
  const top = Math.max(0, ...scored.map((entry) => entry.score));

  if (top === 0) return { inspiration: rotateByDate(library, dateKey), reason: null };

  const threshold = Math.max(1, Math.ceil(top / 2));
  const candidates = scored.filter((entry) => entry.score >= threshold).map((entry) => entry.inspiration);
  const chosen = rotateByDate(candidates, dateKey);

  const strongestTag = chosen.tags
    .map((tag) => weights.get(tag))
    .filter((entry): entry is TagWeight => entry !== undefined)
    .sort((a, b) => b.weight - a.weight)[0];

  return { inspiration: chosen, reason: strongestTag?.reason ?? null };
}
