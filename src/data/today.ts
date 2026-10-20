import { content } from '@/content';
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
 * minutes rather than a proper sitting. Picked and ordered in Sanity
 * (Studio → Home screen).
 */
const PICKS: { id: string; rating: number }[] = content.home.today;

export const todaysPicks: TodayPick[] = PICKS.flatMap(({ id, rating }) => {
  const meditation = getMeditation(id);
  if (!meditation) return [];
  return [{ meditation, rating }];
});
