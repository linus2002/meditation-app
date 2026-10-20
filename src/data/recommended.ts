import type { StaticImageData } from 'next/image';

import { photos } from '@/data/images';
import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

export interface Recommendation {
  meditation: Meditation;
  /** The pill sitting over the artwork. */
  collection: string;
  /** Purpose-made card artwork, where one exists for this slot. */
  image: StaticImageData;
}

/**
 * The recommended rail on the home screen. A short, curated list rather than
 * the whole catalogue — the point is a few good suggestions, not a browser.
 */
const PICKS: { id: string; collection: string; image?: StaticImageData }[] = [
  // Every slot uses purpose-made card artwork rather than the session's own
  // photograph, and nothing here repeats the "Your meditations for today" row.
  { id: 'ocean-drift', collection: 'Unwinding Collection', image: photos.recoOne },
  { id: 'open-heart', collection: 'Gratitude Collection', image: photos.recoFour },
  { id: 'meditation-daily', collection: 'Focus Collection', image: photos.recoThree },
  { id: 'deep-rest', collection: 'Sleep Collection', image: photos.recoTwo },
  { id: 'body-scan', collection: 'Relaxation Collection', image: photos.recoFive },
];

export const recommended: Recommendation[] = PICKS.flatMap(({ id, collection, image }) => {
  const meditation = getMeditation(id);
  return meditation ? [{ meditation, collection, image: image ?? meditation.image }] : [];
});
