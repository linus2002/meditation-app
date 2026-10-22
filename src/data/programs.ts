import type { StaticImageData } from 'next/image';

import { content, toImage } from '@/content';
import { getMeditation } from '@/data/meditations';
import type { Meditation } from '@/types';

export interface Program {
  id: string;
  /** Set in large type over the artwork, so it stays short. */
  title: string;
  author: string;
  /** One or two sentences on what the programme is for, shown on its page. */
  description: string;
  /** Who it suits, e.g. "Beginner", shown in the programme's summary line. */
  level: string;
  /** The programme's sessions, in the order they are meant to be played. */
  sessions: Meditation[];
  image: StaticImageData;
  href: string;
  /** Tint laid over the photograph so the overlaid title stays readable. */
  scrim: string;
  /** Shown in the home screen rail. */
  featured: boolean;
}

/** Edited in Sanity (Studio → Programmes); sessions are picked there, in order. */
const PROGRAMS: (Omit<Program, 'sessions' | 'href' | 'featured'> & {
  sessionIds: string[];
  featured?: boolean;
})[] = content.programs.map(({ image, ...program }) => ({ ...program, image: toImage(image) }));

/**
 * Every free multi-session programme, listed in the library. The artwork
 * carries the title, so each one is picked for a calm, uncluttered centre.
 * Each opens a page of its own listing the sessions inside it.
 */
export const programs: Program[] = PROGRAMS.map(({ sessionIds, featured, ...program }) => ({
  ...program,
  featured: Boolean(featured),
  href: `/programs/${program.id}`,
  sessions: sessionIds.flatMap((id) => {
    const session = getMeditation(id);
    return session ? [session] : [];
  }),
}));

/** The few ticked "Featured on home" in Sanity, for the home screen rail. */
export const featuredPrograms: Program[] = programs.filter((program) => program.featured);

export function getProgram(id: string): Program | undefined {
  return programs.find((program) => program.id === id);
}
