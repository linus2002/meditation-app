import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react';

import type { CategorySlug } from '@/types';

export interface MoodLevel {
  value: number;
  label: string;
  icon: LucideIcon;
}

/** One scale everywhere: the check-in, and before and after a sitting. */
export const moodLevels: readonly MoodLevel[] = [
  { value: 1, label: 'Struggling', icon: Frown },
  { value: 2, label: 'Low', icon: Annoyed },
  { value: 3, label: 'Okay', icon: Meh },
  { value: 4, label: 'Good', icon: Smile },
  { value: 5, label: 'Great', icon: Laugh },
];

export function moodLabel(value: number): string {
  return moodLevels.find((level) => level.value === Math.round(value))?.label ?? 'Okay';
}

export function isMoodScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Where to look first for a session, by how the reader feels. A low mood gets
 * something soothing rather than something that asks for energy.
 */
export const MOOD_CATEGORIES: Record<number, CategorySlug[]> = {
  1: ['anxiety', 'relaxation', 'breathing'],
  2: ['relaxation', 'anxiety', 'breathing'],
  3: ['breathing', 'relaxation', 'focus'],
  4: ['focus', 'happiness', 'breathing'],
  5: ['happiness', 'focus', 'relaxation'],
};

/** A short, kind line after a check-in. Never a judgement. */
export const MOOD_REPLIES: Record<number, string> = {
  1: 'Thank you for saying so. Something gentle might help a little.',
  2: 'That’s okay. A few quiet minutes may ease it.',
  3: 'Noted. A short sit can help you settle in.',
  4: 'Good to hear. Keep it going with a few minutes for yourself.',
  5: 'Lovely. A short sit can help you hold on to it.',
};
