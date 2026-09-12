import { describe, expect, it } from 'vitest';

import {
  inspirationById,
  inspirationForDate,
  inspirations,
  type InspirationTag,
} from '@/data/inspirations';

/** `count` consecutive date keys starting from a UTC date. */
function days(start: string, count: number): string[] {
  const [year, month, day] = start.split('-').map(Number);
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month - 1, day + index)).toISOString().slice(0, 10),
  );
}

const texts = inspirations.map((entry) => entry.text);

describe('inspirationForDate', () => {
  it('stays the same all day', () => {
    expect(inspirationForDate('2026-09-12')).toBe(inspirationForDate('2026-09-12'));
  });

  it('changes from one day to the next', () => {
    const keys = days('2026-09-01', 60);
    for (let index = 1; index < keys.length; index += 1) {
      expect(inspirationForDate(keys[index])).not.toBe(inspirationForDate(keys[index - 1]));
    }
  });

  it('uses every message once before repeating any', () => {
    const shown = days('2026-01-01', inspirations.length).map(inspirationForDate);
    expect(new Set(shown).size).toBe(inspirations.length);
  });

  it('works across a year end', () => {
    expect(texts).toContain(inspirationForDate('2026-12-31'));
    expect(texts).toContain(inspirationForDate('2027-01-01'));
  });
});

describe('the messages', () => {
  it('have unique ids and unique words', () => {
    expect(new Set(inspirations.map((entry) => entry.id)).size).toBe(inspirations.length);
    expect(new Set(texts).size).toBe(inspirations.length);
  });

  it('can be found by id', () => {
    expect(inspirationById('next-breath')?.text).toBe(
      'You don’t have to be strong every moment. Just take the next breath.',
    );
    expect(inspirationById('no-such-message')).toBeUndefined();
  });

  it('fit whole in a phone notification', () => {
    for (const text of texts) {
      expect(text.length).toBeLessThanOrEqual(90);
    }
  });

  it('give every keyword enough messages to rotate through', () => {
    const tags: InspirationTag[] = [
      'calm',
      'sleep',
      'focus',
      'self-kindness',
      'hard-day',
      'new-start',
      'momentum',
    ];
    for (const tag of tags) {
      const count = inspirations.filter((entry) => entry.tags.includes(tag)).length;
      expect(count, tag).toBeGreaterThanOrEqual(6);
    }
  });
});
