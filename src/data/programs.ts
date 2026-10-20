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
}

/** Edited in Sanity (Studio → Programmes); sessions are picked there, in order. */
const PROGRAMS: (Omit<Program, 'sessions' | 'href'> & { sessionIds: string[] })[] =
  content.programs.map(({ image, ...program }) => ({ ...program, image: toImage(image) }));

/**
 * Multi-session programmes offered free on the home screen. The artwork carries
 * the title, so each one is picked for a calm, uncluttered centre. Each opens a
 * page of its own listing the sessions inside it.
 */
export const freePrograms: Program[] = PROGRAMS.map(({ sessionIds, ...program }) => ({
  ...program,
  href: `/programs/${program.id}`,
  sessions: sessionIds.flatMap((id) => {
    const session = getMeditation(id);
    return session ? [session] : [];
  }),
}));

export function getProgram(id: string): Program | undefined {
  return freePrograms.find((program) => program.id === id);
}
