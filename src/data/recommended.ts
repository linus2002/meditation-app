import type { StaticImageData } from 'next/image';

import { photos } from '@/data/images';
import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

export interface Recommendation {
  meditation: Meditation;
  /** The pill sitting over the artwork. */
  collection: string;
  /** Deep tint behind the card, picked to sit under its artwork. */
  tint: string;
  /** Purpose-made card artwork, where one exists for this slot. */
  image: StaticImageData;
}

/**
 * The recommended rail on the home screen. A short, curated list rather than
 * the whole catalogue — the point is a few good suggestions, not a browser.
 */
const PICKS: { id: string; collection: string; tint: string; image?: StaticImageData }[] = [
  // The first two slots use purpose-made card artwork rather than the session's
  // own photograph; the tints are picked to carry those images' blues downward.
  { id: 'ocean-drift', collection: 'Unwinding Collection', tint: '#123A5C', image: photos.recoOne },
  { id: 'deep-rest', collection: 'Sleep Collection', tint: '#15294B', image: photos.recoTwo },
  { id: 'morning-clarity', collection: 'Focus Collection', tint: '#2A1B10' },
  { id: 'open-heart', collection: 'Gratitude Collection', tint: '#2B1024' },
  { id: 'box-breathing', collection: 'Breathing Collection', tint: '#12261B' },
];

export const recommended: Recommendation[] = PICKS.flatMap(({ id, collection, tint, image }) => {
  const meditation = getMeditation(id);
  return meditation ? [{ meditation, collection, tint, image: image ?? meditation.image }] : [];
});
