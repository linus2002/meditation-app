import { content } from '@/content';

export interface ReflectionPrompt {
  id: string;
  /** The question shown for the day. */
  question: string;
}

/**
 * Reflective prompts, deliberately written to invite noticing rather than
 * self-judgement. None of them ask you to score yourself as a person: the app
 * is not a diagnostic instrument and should never read like one. Edited in
 * Sanity (Studio → Reflection prompts).
 */
export const reflectionPrompts: ReflectionPrompt[] = content.reflectionPrompts;

/**
 * How the reflection sat — the weight of the thought, not a verdict on you.
 * Ordered heaviest to lightest so the scale reads left to right.
 */
export const reflectionWeights = [
  { value: 1, label: 'Heavy' },
  { value: 2, label: 'Uneasy' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Settled' },
  { value: 5, label: 'Light' },
] as const;

export const MAX_REFLECTION_LENGTH = 280;

/** Local calendar date as `YYYY-MM-DD`, avoiding UTC drift near midnight. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The prompt rotates by date rather than at random, so it stays put for the
 * whole day and cannot change under you mid-sentence.
 */
export function promptForDate(dateKey: string): ReflectionPrompt {
  const [year, month, day] = dateKey.split('-').map(Number);
  const daysSinceEpoch = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const index = ((daysSinceEpoch % reflectionPrompts.length) + reflectionPrompts.length) %
    reflectionPrompts.length;
  return reflectionPrompts[index];
}

/** "Today", "Yesterday", or e.g. "Mon 8 Sep". */
export function formatEntryDate(dateKey: string, today = new Date()): string {
  const todayKey = toDateKey(today);
  if (dateKey === todayKey) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toDateKey(yesterday)) return 'Yesterday';

  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function weightLabel(value: number): string {
  return reflectionWeights.find((weight) => weight.value === value)?.label ?? 'Neutral';
}
