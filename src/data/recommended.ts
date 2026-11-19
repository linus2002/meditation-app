import type { StaticImageData } from 'next/image';

import { content, onContentChange, toImage } from '@/content';
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
 * Picked and ordered in Sanity (Studio → Home screen); a slot may carry its own
 * card artwork, otherwise it uses the session's.
 */
export let recommended: Recommendation[] = [];

// Rebuilt whenever fresh content arrives (src/content/live.ts).
onContentChange(() => {
  recommended = content.home.recommended.flatMap(({ id, collection, image }) => {
    const meditation = getMeditation(id);
    return meditation
      ? [{ meditation, collection, image: image ? toImage(image) : meditation.image }]
      : [];
  });
});
