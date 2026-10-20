import { content } from '@/content';

/**
 * Daily inspiration: one short, uplifting line a day.
 *
 * Written for Serenity rather than quoted, so there is no attribution to get
 * wrong and no licence to honour. Each is short enough to read whole in a
 * phone notification, and none of them tell anyone how they ought to feel —
 * they offer permission, not pressure.
 *
 * Every message carries keywords (`tags`). `lib/inspiration.ts` weighs them
 * against what the reader has chosen and what the app already knows — a heavy
 * reflection, a rough night, a few days away — to pick the right one.
 *
 * Ids are stored in each reader's history, so never rename or reuse one.
 */

export type InspirationTag =
  | 'calm'
  | 'sleep'
  | 'focus'
  | 'self-kindness'
  | 'hard-day'
  | 'new-start'
  | 'momentum';

export interface Inspiration {
  id: string;
  text: string;
  tags: InspirationTag[];
}

/** Edited in Sanity (Studio → Daily inspirations); tags are limited to the ones above. */
export const inspirations: Inspiration[] = content.inspirations as Inspiration[];

const byId = new Map(inspirations.map((entry) => [entry.id, entry]));

export function inspirationById(id: string): Inspiration | undefined {
  return byId.get(id);
}

/** Days since 1970 for a `YYYY-MM-DD` key — the basis of every rotation. */
export function dayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** One of `list`, rotating by date: stable all day, different the next. */
export function rotateByDate<T>(list: T[], dateKey: string): T {
  const index = ((dayNumber(dateKey) % list.length) + list.length) % list.length;
  return list[index];
}

/**
 * The same-for-everyone message for a date — used when nothing is known
 * about the reader, and by anything that cannot see their data.
 */
export function inspirationForDate(dateKey: string): string {
  return rotateByDate(inspirations, dateKey).text;
}
