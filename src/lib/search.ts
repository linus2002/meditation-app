import { meditations } from '@/data/meditations';
import { stories } from '@/data/stories';
import { soundscapeList, type SoundscapeMeta } from '@/lib/audio/soundscapes';
import type { Meditation, Story } from '@/types';

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
      { text: normalise(`${item.narrator} ${item.category}`), weight: WEIGHT_ATTRIBUTE },
      { text: normalise(item.description), weight: WEIGHT_BODY },
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
  meditations: Meditation[];
  stories: Story[];
  soundscapes: SoundscapeMeta[];
  total: number;
}

const EMPTY: SearchResults = { meditations: [], stories: [], soundscapes: [], total: 0 };

/**
 * Searches everything the app holds — sessions, stories and soundscapes — in
 * one pass.
 *
 * Search used to cover sessions only, which quietly made the other two thirds
 * of the library unreachable by name: someone looking for "rain" got the
 * session and never learnt there was a rain soundscape and a story set in one.
 */
export function searchLibrary(query: string): SearchResults {
  const terms = queryTerms(query);
  if (terms.length === 0) return EMPTY;

  const found = {
    meditations: rank(meditations.map(meditationEntry), terms),
    stories: rank(stories.map(storyEntry), terms),
    soundscapes: rank(soundscapeList.map(soundscapeEntry), terms),
  };

  return {
    ...found,
    total: found.meditations.length + found.stories.length + found.soundscapes.length,
  };
}
