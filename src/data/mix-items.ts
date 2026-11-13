import type { StaticImageData } from 'next/image';

import { getMeditation, meditations } from '@/data/meditations';
import { getStory, stories } from '@/data/stories';
import { estimatedSeconds } from '@/lib/story';
import type { MixItem } from '@/lib/mixes';

/** What a row in a mix shows, whichever kind of item it is. */
export interface MixItemDetails {
  item: MixItem;
  title: string;
  /** "Meditation · Focus", "Story · Sleep". */
  label: string;
  seconds: number;
  image: StaticImageData;
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Null when the session or story is no longer in the catalogue. */
export function mixItemDetails(item: MixItem): MixItemDetails | null {
  if (item.kind === 'meditation') {
    const meditation = getMeditation(item.id);
    if (!meditation) return null;
    return {
      item,
      title: meditation.title,
      label: `Meditation · ${capitalise(meditation.category)}`,
      seconds: meditation.durationSeconds,
      image: meditation.image,
    };
  }
  const story = getStory(item.id);
  if (!story) return null;
  return {
    item,
    title: story.title,
    label: `Story · ${capitalise(story.category)}`,
    seconds: story.narration?.duration ?? estimatedSeconds(story),
    image: story.cover ?? story.image,
  };
}

/** Everything that can go in a mix, for the picker. */
export function mixCatalogue(kind: MixItem['kind']): MixItemDetails[] {
  const items: MixItem[] =
    kind === 'meditation'
      ? meditations.map((m) => ({ kind, id: m.id }))
      : stories.map((s) => ({ kind, id: s.id }));
  return items.map(mixItemDetails).filter((d): d is MixItemDetails => d !== null);
}

