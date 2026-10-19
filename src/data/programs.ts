import type { StaticImageData } from 'next/image';

import { photos } from '@/data/images';
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

const PROGRAMS: (Omit<Program, 'sessions' | 'href'> & { sessionIds: string[] })[] = [
  {
    id: 'six-phase',
    title: 'The Six Phase',
    author: 'Ava Lindqvist',
    description:
      'Six short practices that move from connection and gratitude through forgiveness to the day ahead. Take one a day, in order, or return to whichever you need.',
    level: 'Beginner',
    sessionIds: [
      'six-phase-connection',
      'six-phase-gratitude',
      'six-phase-forgiveness',
      'six-phase-future-dream',
      'six-phase-perfect-day',
      'six-phase-blessing',
    ],
    image: photos.starfield,
    scrim: 'rgba(12,22,66,0.52)',
  },
  {
    id: 'sleep-mastery',
    title: 'Sleep Mastery',
    author: 'Ines Moreau',
    description:
      'A week of wind-downs for nights when sleep will not come. Each one is a little longer and a little quieter than the last.',
    level: 'All levels',
    sessionIds: [
      'sleep-mastery-unclench',
      'sleep-mastery-heavy-body',
      'sleep-mastery-counting-down',
      'sleep-mastery-worry-parking',
      'sleep-mastery-night-breath',
      'sleep-mastery-long-exhale',
      'sleep-mastery-drifting-off',
    ],
    image: photos.milkyWay,
    scrim: 'rgba(8,14,44,0.5)',
  },
  {
    id: 'steady-mind',
    title: 'A Steady Mind',
    author: 'Noah Brandt',
    description:
      'Five practices for anxious moments: noticing what is there, grounding in the body, and letting a wave of worry pass on its own.',
    level: 'Beginner',
    sessionIds: [
      'steady-mind-name-it',
      'steady-mind-anchor',
      'steady-mind-wave',
      'steady-mind-observer',
      'steady-mind-steady-ground',
    ],
    image: photos.mountainValley,
    scrim: 'rgba(10,26,34,0.5)',
  },
  {
    id: 'open-water',
    title: 'Open Water',
    author: 'Ava Lindqvist',
    description:
      'Four ocean-paced relaxations, from the shoreline out to open sea and back, for making room when everything feels tight.',
    level: 'All levels',
    sessionIds: [
      'open-water-shoreline',
      'open-water-tidepool',
      'open-water-open-sea',
      'open-water-return',
    ],
    image: photos.aerialSea,
    scrim: 'rgba(6,30,52,0.48)',
  },
];

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
