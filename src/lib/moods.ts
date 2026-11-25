import { isMoodScore } from '@/data/moods';
import type { MoodContext, MoodEntry } from '@/types';

/** The most moods kept on the phone: years of daily check-ins. */
export const MAX_MOODS = 3000;

/** The history with this entry in it: newest first, one copy per id. */
export function withMood(entries: MoodEntry[], entry: MoodEntry): MoodEntry[] {
  return [entry, ...entries.filter((item) => item.id !== entry.id)]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_MOODS);
}

const CONTEXTS: readonly MoodContext[] = ['checkin', 'before', 'after'];

/** Only well-formed entries survive a read from storage. */
export function validMoods(value: unknown): MoodEntry[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (entry): entry is MoodEntry =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
      typeof entry.at === 'number' &&
      isMoodScore(entry.score) &&
      CONTEXTS.includes(entry.context),
  );
}

/** The day's check-in, the latest if it was changed. */
export function checkinOn(entries: MoodEntry[], date: string): MoodEntry | undefined {
  return entries
    .filter((entry) => entry.context === 'checkin' && entry.date === date)
    .sort((a, b) => b.at - a.at)[0];
}

/**
 * How the reader felt on a day, as the average of what they came in with:
 * check-ins and the moods given before a sitting. The "after" moods are left
 * out, since straight after meditating is not a fair picture of the day.
 */
export function moodOfDay(entries: MoodEntry[], date: string): number | null {
  const scores = entries
    .filter((entry) => entry.date === date && entry.context !== 'after')
    .map((entry) => entry.score);
  if (scores.length === 0) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export interface MoodShift {
  /** Sittings with both a before and an after. */
  pairs: number;
  /** Average of after − before, on the 1-5 scale. */
  average: number;
  /** How many felt better, the same, and worse. */
  better: number;
  same: number;
  worse: number;
}

/** What changes across a sitting, from the before/after pairs given. */
export function moodShift(entries: MoodEntry[], filter: (entry: MoodEntry) => boolean = () => true): MoodShift {
  const before = new Map<string, number>();
  const after = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.pairId || !filter(entry)) continue;
    if (entry.context === 'before') before.set(entry.pairId, entry.score);
    if (entry.context === 'after') after.set(entry.pairId, entry.score);
  }

  const changes: number[] = [];
  for (const [pairId, end] of after) {
    const start = before.get(pairId);
    if (start !== undefined) changes.push(end - start);
  }

  return {
    pairs: changes.length,
    average: changes.length ? changes.reduce((total, change) => total + change, 0) / changes.length : 0,
    better: changes.filter((change) => change > 0).length,
    same: changes.filter((change) => change === 0).length,
    worse: changes.filter((change) => change < 0).length,
  };
}

/** A new id for one sitting's before/after pair. */
export function newPairId(now = Date.now()): string {
  return `sit-${now}-${Math.random().toString(36).slice(2, 8)}`;
}
