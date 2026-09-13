import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

export interface TodayPick {
  meditation: Meditation;
  /** Listener rating shown beneath the title. */
  rating: number;
}

/**
 * The short sits offered on the home screen for the current day. Deliberately
 * weighted towards the quick ones — this row is for the days you have a few
 * minutes rather than a proper sitting.
 */
const PICKS: { id: string; rating: number }[] = [
  { id: 'midday-reset', rating: 4.6 },
  { id: 'box-breathing', rating: 4.7 },
  { id: 'free-your-mind', rating: 4.8 },
  { id: 'quiet-the-noise', rating: 4.5 },
  { id: 'morning-clarity', rating: 4.9 },
];

export const todaysPicks: TodayPick[] = PICKS.flatMap(({ id, rating }) => {
  const meditation = getMeditation(id);
  if (!meditation) return [];
  return [{ meditation, rating }];
});
