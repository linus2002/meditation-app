import { content } from '@/content';
import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

/**
 * The short sits offered on the home screen for the current day. Deliberately
 * weighted towards the quick ones — this row is for the days you have a few
 * minutes rather than a proper sitting. Picked and ordered in Sanity
 * (Studio → Home screen).
 *
 * Sanity also carries a `rating` per pick, but it is not used: the rail shows
 * the reader's own score (app-provider `ratings`), never a number somebody else
 * supposedly gave it.
 */
export const todaysPicks: Meditation[] = content.home.today.flatMap(({ id }) => {
  const meditation = getMeditation(id);
  return meditation ? [meditation] : [];
});
