import type { StaticImageData } from 'next/image';

import { photos } from '@/data/images';

export interface Program {
  id: string;
  /** Set in large type over the artwork, so it stays short. */
  title: string;
  author: string;
  /** Sessions in the programme, shown alongside the author. */
  sessions: number;
  image: StaticImageData;
  href: string;
  /** Tint laid over the photograph so the overlaid title stays readable. */
  scrim: string;
}

/**
 * Multi-session programmes offered free on the home screen. The artwork carries
 * the title, so each one is picked for a calm, uncluttered centre.
 */
export const freePrograms: Program[] = [
  {
    id: 'six-phase',
    title: 'The Six Phase',
    author: 'Ava Lindqvist',
    sessions: 6,
    image: photos.starfield,
    href: '/discover?category=focus',
    scrim: 'rgba(12,22,66,0.52)',
  },
  {
    id: 'sleep-mastery',
    title: 'Sleep Mastery',
    author: 'Ines Moreau',
    sessions: 7,
    image: photos.milkyWay,
    href: '/discover?category=sleep',
    scrim: 'rgba(8,14,44,0.5)',
  },
  {
    id: 'steady-mind',
    title: 'A Steady Mind',
    author: 'Noah Brandt',
    sessions: 5,
    image: photos.mountainValley,
    href: '/discover?category=anxiety',
    scrim: 'rgba(10,26,34,0.5)',
  },
  {
    id: 'open-water',
    title: 'Open Water',
    author: 'Ava Lindqvist',
    sessions: 4,
    image: photos.aerialSea,
    href: '/discover?category=relaxation',
    scrim: 'rgba(6,30,52,0.48)',
  },
];
