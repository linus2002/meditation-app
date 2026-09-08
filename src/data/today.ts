import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

export interface TodayPick {
  meditation: Meditation;
  /** Eyebrow above the artwork, derived from the session's own length. */
  band: string;
  /** Listener rating shown beneath the title. */
  rating: number;
  /** Sessions offered outside the subscription carry the "Try free" pill. */
  tryFree?: boolean;
}

/**
 * The short sits offered on the home screen for the current day. Deliberately
 * weighted towards the quick ones — this row is for the days you have a few
 * minutes rather than a proper sitting.
 */
const PICKS: { id: string; rating: number; tryFree?: boolean }[] = [
  { id: 'midday-reset', rating: 4.6 },
  { id: 'box-breathing', rating: 4.7, tryFree: true },
  { id: 'free-your-mind', rating: 4.8 },
  { id: 'quiet-the-noise', rating: 4.5, tryFree: true },
  { id: 'morning-clarity', rating: 4.9 },
];

/** Groups a session into the length band shown above its artwork. */
function durationBand(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes <= 5) return 'Under 5 mins';
  if (minutes <= 10) return 'Under 10 mins';
  if (minutes <= 20) return 'Under 20 mins';
  return 'A longer sit';
}

export const todaysPicks: TodayPick[] = PICKS.flatMap(({ id, rating, tryFree }) => {
  const meditation = getMeditation(id);
  if (!meditation) return [];
  return [{ meditation, band: durationBand(meditation.durationSeconds), rating, tryFree }];
});
