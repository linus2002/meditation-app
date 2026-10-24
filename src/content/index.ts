import type { StaticImageData } from 'next/image';

import type { BreathPhase, CategorySlug, DeckTone, StoryCategory, StoryNarration } from '@/types';
import type { SoundscapeId } from '@/lib/audio/soundscapes';
import type { YogaPose } from '@/lib/yoga';

import raw from './content.json';

/**
 * The app's editable content, as last pulled from Sanity by
 * `scripts/sanity/pull.mjs`. Edit it in the Studio, not here: the next build
 * overwrites this file. The modules under src/data shape it for the screens.
 */

/** A picture on Sanity's image CDN, with what next/image needs. */
export interface ContentImage {
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  /** The editor's hotspot, as a CSS object-position. */
  focus?: string;
}

export interface ContentMeditation {
  id: string;
  title: string;
  subtitle: string;
  narrator: string;
  category: CategorySlug;
  durationMinutes: number;
  tone: DeckTone;
  image: ContentImage;
  imageAlt: string;
  cover?: ContentImage;
  coverFocus?: string;
  soundscape: SoundscapeId;
  description: string;
  isSleep?: boolean;
  isDailyGoal?: boolean;
  /** False for sessions that only live inside a programme. */
  inLibrary?: boolean;
  breathPattern: BreathPhase[];
}

export interface ContentProgram {
  id: string;
  title: string;
  author: string;
  level: string;
  description: string;
  scrim: string;
  /** Shown in the home screen rail; every programme is listed in the library. */
  featured?: boolean;
  sessionIds: string[];
  image: ContentImage;
}

export interface ContentStory {
  id: string;
  title: string;
  description: string;
  category: StoryCategory;
  voice: string;
  /** Shown in the home screen rail; every story is listed in the library. */
  featured?: boolean;
  image: ContentImage;
  /** Square poster for the home screen rail, when it differs from the artwork. */
  cover?: ContentImage;
  imageAlt: string;
  soundscape: SoundscapeId;
  paragraphs: string[];
  /** Streamed from Sanity's CDN; recorded by `npm run content:narrate`. */
  narration?: StoryNarration;
}

export interface ContentYoga {
  id: string;
  title: string;
  subtitle: string;
  focus: string;
  level: 'Gentle' | 'Beginner' | 'All levels';
  image: ContentImage;
  imageAlt: string;
  soundscape: SoundscapeId;
  description: string;
  poses: YogaPose[];
}

export interface ContentVideo {
  id: string;
  title: string;
  eyebrow: string;
  /** Streamed from Sanity's CDN. */
  src: string;
  /** A still on Sanity's image CDN. */
  poster: string;
}

export interface ContentCategory {
  slug: CategorySlug;
  name: string;
  sessionCount: number;
  icon: string;
  tone: DeckTone;
  image: ContentImage;
}

export interface ContentDeckCard {
  id: string;
  title: string;
  caption: string;
  href: string;
  tone: DeckTone;
  image: ContentImage;
}

export interface Content {
  meditations: ContentMeditation[];
  programs: ContentProgram[];
  stories: ContentStory[];
  yoga: ContentYoga[];
  videos: ContentVideo[];
  categories: ContentCategory[];
  deckCards: ContentDeckCard[];
  inspirations: { id: string; text: string; tags: string[] }[];
  reflectionPrompts: { id: string; question: string }[];
  home: {
    recommended: { id: string; collection: string; image?: ContentImage }[];
    today: { id: string; rating: number }[];
  };
}

export const content = raw as unknown as Content;

/** A 1×1 transparent GIF, for the rare image Sanity sends without a preview. */
const EMPTY_BLUR =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * In the shape of a static image import, so next/image treats a downloaded
 * picture exactly like a bundled one: known size, blur-up placeholder.
 */
export function toImage(image: ContentImage): StaticImageData {
  return {
    src: image.src,
    width: image.width,
    height: image.height,
    blurDataURL: image.blurDataURL ?? EMPTY_BLUR,
  };
}
