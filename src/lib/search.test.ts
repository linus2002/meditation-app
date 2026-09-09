import { describe, expect, it } from 'vitest';

import { queryTerms, searchLibrary } from '@/lib/search';

const ids = <T extends { id: string }>(items: T[]) => items.map((item) => item.id);

describe('queryTerms', () => {
  it('lowercases and splits on whitespace', () => {
    expect(queryTerms('Box Breathing')).toEqual(['box', 'breathing']);
  });

  it('collapses runs of whitespace', () => {
    expect(queryTerms('  box   breathing ')).toEqual(['box', 'breathing']);
  });

  it('gives nothing back for an empty query', () => {
    expect(queryTerms('')).toEqual([]);
    expect(queryTerms('   ')).toEqual([]);
  });
});

describe('searchLibrary', () => {
  /*
   * The reason this module exists. Search used to run over sessions alone, so
   * two thirds of the library was unreachable by name: someone searching
   * "rain" got the session and never learnt there was a rain soundscape and a
   * story set in one.
   */
  it('reaches all three content types from one term', () => {
    const results = searchLibrary('rain');
    expect(results.meditations.length).toBeGreaterThan(0);
    expect(results.stories.length).toBeGreaterThan(0);
    expect(results.soundscapes.length).toBeGreaterThan(0);
  });

  it('counts every type in the total', () => {
    const results = searchLibrary('rain');
    const parts =
      results.meditations.length + results.stories.length + results.soundscapes.length;
    expect(results.total).toBe(parts);
  });

  it('finds a soundscape by name', () => {
    expect(ids(searchLibrary('ocean').soundscapes)).toContain('ocean');
  });

  it('finds a session by narrator', () => {
    expect(searchLibrary('lindqvist').meditations.length).toBeGreaterThan(0);
  });

  it('finds a session by category', () => {
    expect(ids(searchLibrary('breathing').meditations)).toContain('box-breathing');
  });

  it('ranks a title match above a match in the body', () => {
    const [first] = searchLibrary('rain').meditations;
    expect(first.id).toBe('rain-on-glass');
  });

  it('treats several terms as AND, not OR', () => {
    expect(searchLibrary('rain xylophone').total).toBe(0);
  });

  it('does not care about term order', () => {
    expect(searchLibrary('breathing box').total).toBe(searchLibrary('box breathing').total);
  });

  it('is case insensitive', () => {
    expect(searchLibrary('RAIN').total).toBe(searchLibrary('rain').total);
  });

  /* An empty field means "browse", so it must not fall through to everything. */
  it('returns nothing for an empty query rather than the whole library', () => {
    expect(searchLibrary('').total).toBe(0);
    expect(searchLibrary('    ').total).toBe(0);
  });

  /*
   * The term is interpolated into a RegExp for the word-boundary bonus, so an
   * unescaped bracket would throw inside the reader's search field.
   */
  it('survives regex metacharacters in the query', () => {
    expect(() => searchLibrary('rain(*')).not.toThrow();
    expect(() => searchLibrary('[')).not.toThrow();
    expect(() => searchLibrary('a{2,')).not.toThrow();
    expect(searchLibrary('[').total).toBe(0);
  });

  it('returns no duplicates within a group', () => {
    const results = searchLibrary('the');
    const found = ids(results.meditations);
    expect(new Set(found).size).toBe(found.length);
  });
});
