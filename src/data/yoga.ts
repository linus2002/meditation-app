import type { StaticImageData } from 'next/image';

import { content, toImage } from '@/content';
import type { SoundscapeId } from '@/lib/audio/soundscapes';
import type { YogaPose } from '@/lib/yoga';

/**
 * Guided yoga: short, gentle sequences written for Serenity, played one pose
 * at a time with a soft bell between poses.
 *
 * Every pose is beginner-friendly and none needs equipment beyond a wall, a
 * chair or a bed. Each session's length is the sum of its poses. Ids appear
 * in the URL (/yoga/<id>) and in the offline precache, so never rename one.
 */

export type YogaLevel = 'Gentle' | 'Beginner' | 'All levels';

export interface YogaSession {
  id: string;
  title: string;
  subtitle: string;
  /** Short label for when or what it's for, e.g. "Morning". */
  focus: string;
  level: YogaLevel;
  image: StaticImageData;
  imageAlt: string;
  /** The ambient bed that plays underneath, if ambience is on. */
  soundscape: SoundscapeId;
  description: string;
  poses: YogaPose[];
}

/** Shown before every session and on the Yoga tab. */
export const YOGA_SAFETY =
  'Move gently and never into pain — soften or skip any pose. If you’re pregnant, injured or have a health condition, check with a doctor before you start.';

/** Edited in Sanity (Studio → Yoga); each pose is listed there, sides included. */
export const yogaSessions: YogaSession[] = content.yoga.map(({ image, ...session }) => ({
  ...session,
  image: toImage(image),
}));

export function getYogaSession(id: string): YogaSession | undefined {
  return yogaSessions.find((session) => session.id === id);
}
