export interface ReflectionPrompt {
  id: string;
  /** The question shown for the day. */
  question: string;
}

/**
 * Reflective prompts, deliberately written to invite noticing rather than
 * self-judgement. None of them ask you to score yourself as a person: the app
 * is not a diagnostic instrument and should never read like one.
 */
export const reflectionPrompts: ReflectionPrompt[] = [
  { id: 'handled-better', question: 'What did you handle better than you expected?' },
  { id: 'most-yourself', question: 'When did you feel most like yourself today?' },
  { id: 'quietly-well', question: 'What went quietly well that you might otherwise skip past?' },
  { id: 'not-yours', question: "What are you carrying that isn't yours to carry?" },
  { id: 'tell-a-friend', question: 'What would you say to a friend who had the day you just had?' },
  { id: 'rushed', question: 'Where did you rush today when you did not need to?' },
  { id: 'steady', question: 'When did you feel steady, even briefly?' },
  { id: 'kinder', question: 'Where were you kinder than you strictly had to be?' },
  { id: 'leave-behind', question: 'What is one thing you would like to leave behind today?' },
  { id: 'attention', question: 'What did you give your attention to that deserved it?' },
  { id: 'readier', question: 'What are you readier for now than you were a month ago?' },
  { id: 'noticed', question: "What did you notice today that you'd usually miss?" },
  { id: 'took-more', question: 'What took more out of you than it should have?' },
  { id: 'asked-and-gave', question: 'What did today ask of you, and what did you give it?' },
];

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
