import { Compass, Flower2, MessageCircleHeart, PersonStanding, UserRound } from 'lucide-react';

import { onContentChange } from '@/content';
import { allSessions } from '@/data/meditations';
import { programs, type Program } from '@/data/programs';
import { appShortcuts, type Shortcut } from '@/data/shortcuts';
import { stories } from '@/data/stories';
import { yogaSessions, type YogaSession } from '@/data/yoga';
import { soundscapeList, type SoundscapeMeta } from '@/lib/audio/soundscapes';
import type { Meditation, Story } from '@/types';

/**
 * Screens a reader might look for by name: the tabs, plus every shortcut from
 * the home menu. `keywords` carries words people use that the label does not.
 */
const PAGES: (Shortcut & { keywords?: string })[] = [
  {
    href: '/meditations',
    label: 'Meditations',
    description: 'The full library of guided sessions and programmes',
    icon: Flower2,
    keywords: 'library sessions programmes programs',
  },
  {
    href: '/yoga',
    label: 'Yoga',
    description: 'Gentle guided yoga, one pose at a time',
    icon: PersonStanding,
    keywords: 'stretch poses movement',
  },
  {
    href: '/kapwa',
    label: 'Kapwa',
    description: 'Your guide: ask for a session for how you feel',
    icon: MessageCircleHeart,
    keywords: 'chat guide help assistant',
  },
  {
    href: '/discover',
    label: 'Discover',
    description: 'Browse by mood and find something new',
    icon: Compass,
    keywords: 'browse explore',
  },
  {
    href: '/profile',
    label: 'Profile',
    description: 'Your account, preferences and shortcuts',
    icon: UserRound,
    keywords: 'account settings preferences',
  },
  ...appShortcuts,
];

/** Programme titles each session belongs to, so a programme's name finds its sessions too. */
let programTitlesBySession = new Map<string, string>();

// Rebuilt with the programmes whenever fresh content arrives (src/content/live.ts).
onContentChange(() => {
  programTitlesBySession = new Map();
  for (const program of programs) {
    for (const session of program.sessions) {
      const before = programTitlesBySession.get(session.id);
      programTitlesBySession.set(session.id, before ? `${before} ${program.title}` : program.title);
    }
  }
});

/**
 * One searchable thing, flattened out of whichever collection it came from.
 *
 * Every content type is reduced to the same shape here so ranking can compare
 * a story against a soundscape without either one needing to know about the
 * other. `haystack` is ordered by weight: the earlier a field, the more a hit
 * in it counts.
 */
interface Entry<T> {
  item: T;
  /** Field text paired with what a match in that field is worth. */
  fields: { text: string; weight: number }[];
}

const WEIGHT_TITLE = 6;
const WEIGHT_SUBTITLE = 3;
const WEIGHT_ATTRIBUTE = 2;
const WEIGHT_BODY = 1;

function normalise(value: string): string {
  return value.toLowerCase().trim();
}

/** Splits a query into terms. Every term has to match something, somewhere. */
export function queryTerms(query: string): string[] {
  return normalise(query).split(/\s+/).filter(Boolean);
}

/**
 * Scores one entry against the terms, or returns 0 when any term is missing.
 *
 * A term scores its best field rather than every field it appears in, so a word
 * repeated through a long description cannot outrank a title match.
 */
function score<T>(entry: Entry<T>, terms: string[]): number {
  let total = 0;

  for (const term of terms) {
    let best = 0;
    for (const field of entry.fields) {
      if (!field.text.includes(term)) continue;
      // A term starting a word beats one buried inside another word.
      const boundary = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(field.text);
      const value = boundary ? field.weight : field.weight / 2;
      if (value > best) best = value;
    }
    if (best === 0) return 0;
    total += best;
  }

  return total;
}

function meditationEntry(item: Meditation): Entry<Meditation> {
  return {
    item,
    fields: [
      { text: normalise(item.title), weight: WEIGHT_TITLE },
      { text: normalise(item.subtitle), weight: WEIGHT_SUBTITLE },
      {
        text: normalise(`${item.narrator} ${item.category} ${programTitlesBySession.get(item.id) ?? ''}`),
        weight: WEIGHT_ATTRIBUTE,
      },
      { text: normalise(item.description), weight: WEIGHT_BODY },
    ],
  };
}

function programEntry(item: Program): Entry<Program> {
  return {
    item,
    fields: [
      { text: normalise(item.title), weight: WEIGHT_TITLE },
      { text: normalise(item.description), weight: WEIGHT_SUBTITLE },
      { text: normalise(`${item.author} ${item.level} programme program`), weight: WEIGHT_ATTRIBUTE },
      { text: normalise(item.sessions.map((session) => session.title).join(' ')), weight: WEIGHT_BODY },
    ],
  };
}

function yogaEntry(item: YogaSession): Entry<YogaSession> {
  return {
    item,
    fields: [
      { text: normalise(item.title), weight: WEIGHT_TITLE },
      { text: normalise(item.subtitle), weight: WEIGHT_SUBTITLE },
      { text: normalise(`${item.focus} ${item.level} yoga`), weight: WEIGHT_ATTRIBUTE },
      {
        text: normalise(`${item.description} ${item.poses.map((pose) => pose.name).join(' ')}`),
        weight: WEIGHT_BODY,
      },
    ],
  };
}

function pageEntry(item: (typeof PAGES)[number]): Entry<Shortcut> {
  return {
    item,
    fields: [
      { text: normalise(item.label), weight: WEIGHT_TITLE },
      { text: normalise(item.description), weight: WEIGHT_SUBTITLE },
      { text: normalise(item.keywords ?? ''), weight: WEIGHT_ATTRIBUTE },
    ],
  };
}

function storyEntry(item: Story): Entry<Story> {
  return {
    item,
    fields: [
      { text: normalise(item.title), weight: WEIGHT_TITLE },
      { text: normalise(item.description), weight: WEIGHT_SUBTITLE },
      { text: normalise(`${item.voice} ${item.category}`), weight: WEIGHT_ATTRIBUTE },
      // The story itself is searchable — half-remembered lines are how people
      // look for one of these.
      { text: normalise(item.paragraphs.join(' ')), weight: WEIGHT_BODY },
    ],
  };
}

function soundscapeEntry(item: SoundscapeMeta): Entry<SoundscapeMeta> {
  return {
    item,
    fields: [
      { text: normalise(item.name), weight: WEIGHT_TITLE },
      { text: normalise(item.description), weight: WEIGHT_SUBTITLE },
    ],
  };
}

function rank<T>(entries: Entry<T>[], terms: string[]): T[] {
  return entries
    .map((entry) => ({ item: entry.item, score: score(entry, terms) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((hit) => hit.item);
}

export interface SearchResults {
  programs: Program[];
  meditations: Meditation[];
  stories: Story[];
  yoga: YogaSession[];
  soundscapes: SoundscapeMeta[];
  pages: Shortcut[];
  total: number;
}

const EMPTY: SearchResults = {
  programs: [],
  meditations: [],
  stories: [],
  yoga: [],
  soundscapes: [],
  pages: [],
  total: 0,
};

/**
 * Searches everything the app holds — programmes, sessions, stories, yoga,
 * soundscapes and the app's own screens — in one pass.
 *
 * Search used to cover sessions only, which quietly made the other two thirds
 * of the library unreachable by name: someone looking for "rain" got the
 * session and never learnt there was a rain soundscape and a story set in one.
 */
export function searchLibrary(query: string): SearchResults {
  const terms = queryTerms(query);
  if (terms.length === 0) return EMPTY;

  const found = {
    programs: rank(programs.map(programEntry), terms),
    meditations: rank(allSessions.map(meditationEntry), terms),
    stories: rank(stories.map(storyEntry), terms),
    yoga: rank(yogaSessions.map(yogaEntry), terms),
    soundscapes: rank(soundscapeList.map(soundscapeEntry), terms),
    pages: rank(PAGES.map(pageEntry), terms),
  };

  return {
    ...found,
    total: Object.values(found).reduce((sum, list) => sum + list.length, 0),
  };
}
