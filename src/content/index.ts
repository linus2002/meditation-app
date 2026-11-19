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
  /** Guided audio, streamed from Sanity's CDN; uploaded by `npm run content:recordings`. */
  recording?: ContentRecording;
}

export interface ContentRecording {
  src: string;
  /** Seconds, as measured from the file. */
  duration: number;
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
  /** When this copy was fetched from Sanity (ISO time); missing on very old builds. */
  pulledAt?: string;
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

/** The copy built into the app: first launch, offline, and the server render. */
export const bundledContent = raw as unknown as Content;

/**
 * The content the app is showing now. Starts as the built-in copy and is
 * replaced by a fresher one from Sanity (see live.ts) once the app is running.
 *
 * `export let` on purpose: ES module bindings are live, so every module that
 * imports `content` reads the replacement. The data modules under src/data
 * register with `onContentChange` to rebuild what they derive from it.
 */
export let content: Content = bundledContent;

const listeners: (() => void)[] = [];

/** Runs `rebuild` now and again after every content change, in registration order. */
export function onContentChange(rebuild: () => void): void {
  listeners.push(rebuild);
  rebuild();
}

/**
 * Item ids that have a page of their own in this build. A static app build only
 * has pages for the sessions, stories, programmes and yoga that existed when it
 * was made, so anything newer than the build is held back until the next one;
 * otherwise tapping it would open a missing page.
 */
const routable = {
  meditations: new Set(bundledContent.meditations.map((item) => item.id)),
  programs: new Set(bundledContent.programs.map((item) => item.id)),
  stories: new Set(bundledContent.stories.map((item) => item.id)),
  yoga: new Set(bundledContent.yoga.map((item) => item.id)),
};

/** Keeps a fresh copy to what this build can open: edits pass, brand-new pages wait. */
function forThisBuild(next: Content): Content {
  const meditations = next.meditations.filter((item) => routable.meditations.has(item.id));
  const sessionIds = new Set(meditations.map((item) => item.id));
  return {
    ...next,
    meditations,
    programs: next.programs
      .filter((item) => routable.programs.has(item.id))
      .map((program) => ({ ...program, sessionIds: (program.sessionIds ?? []).filter((id) => sessionIds.has(id)) })),
    stories: next.stories.filter((item) => routable.stories.has(item.id)),
    yoga: next.yoga.filter((item) => routable.yoga.has(item.id)),
    home: {
      recommended: (next.home?.recommended ?? []).filter((pick) => sessionIds.has(pick.id)),
      today: (next.home?.today ?? []).filter((pick) => sessionIds.has(pick.id)),
    },
  };
}

/** Whether a fetched or stored copy is complete enough to show. */
export function isUsableContent(value: unknown): value is Content {
  const c = value as Partial<Content> | null;
  return Boolean(
    c &&
      Array.isArray(c.meditations) &&
      c.meditations.length > 0 &&
      Array.isArray(c.programs) &&
      Array.isArray(c.stories) &&
      Array.isArray(c.yoga) &&
      Array.isArray(c.videos) &&
      Array.isArray(c.categories) &&
      Array.isArray(c.deckCards) &&
      Array.isArray(c.inspirations) &&
      c.inspirations.length > 0 &&
      Array.isArray(c.reflectionPrompts) &&
      c.reflectionPrompts.length > 0 &&
      c.home,
  );
}

/**
 * Swaps in a fresh copy and rebuilds everything derived from it. Returns false
 * (and changes nothing) when the copy is unusable or rebuilding fails, so the
 * app always keeps working content.
 */
export function replaceContent(next: Content): boolean {
  if (!isUsableContent(next)) return false;
  const previous = content;
  try {
    content = forThisBuild(next);
    for (const rebuild of listeners) rebuild();
    return true;
  } catch {
    content = previous;
    for (const rebuild of listeners) rebuild();
    return false;
  }
}

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
