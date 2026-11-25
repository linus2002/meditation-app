import { describe, expect, it } from 'vitest';

import { sessionForMood } from '@/components/home/mood-checkin';
import { isMoodScore, moodLabel, moodLevels } from '@/data/moods';
import { checkinOn, moodOfDay, moodShift, validMoods, withMood } from '@/lib/moods';
import type { MoodEntry } from '@/types';

const mood = (overrides: Partial<MoodEntry> & Pick<MoodEntry, 'id' | 'score'>): MoodEntry => ({
  date: '2026-09-09',
  at: 1,
  context: 'checkin',
  ...overrides,
});

describe('the mood scale', () => {
  it('runs from Struggling to Great', () => {
    expect(moodLevels.map((level) => level.label)).toEqual(['Struggling', 'Low', 'Okay', 'Good', 'Great']);
    expect(moodLabel(3.6)).toBe('Good');
  });

  it('only takes whole points from 1 to 5', () => {
    expect([1, 5].every(isMoodScore)).toBe(true);
    expect([0, 6, 2.5, '3', null].some(isMoodScore)).toBe(false);
  });
});

describe('storing moods', () => {
  it('replaces an entry with the same id, newest first', () => {
    const first = mood({ id: 'checkin-2026-09-09', score: 2, at: 10 });
    const other = mood({ id: 'x', score: 4, at: 20 });
    const changed = mood({ id: 'checkin-2026-09-09', score: 4, at: 30 });
    expect(withMood(withMood([first, other], changed), other).map((entry) => [entry.id, entry.score])).toEqual([
      ['checkin-2026-09-09', 4],
      ['x', 4],
    ]);
  });

  it('drops damaged entries read back from storage', () => {
    const good = mood({ id: 'a', score: 3 });
    expect(validMoods([good, { ...good, id: 'b', score: 9 }, { ...good, id: 'c', context: 'odd' }, null, 'x'])).toEqual([good]);
    expect(validMoods('nope')).toBeNull();
  });
});

describe('reading moods', () => {
  const entries = [
    mood({ id: 'c1', score: 2, at: 1 }),
    mood({ id: 'c2', score: 4, at: 5 }),
    mood({ id: 'p:before', score: 3, context: 'before', pairId: 'p' }),
    mood({ id: 'p:after', score: 5, context: 'after', pairId: 'p' }),
  ];

  it('finds the day’s latest check-in', () => {
    expect(checkinOn(entries, '2026-09-09')?.id).toBe('c2');
    expect(checkinOn(entries, '2026-09-10')).toBeUndefined();
  });

  it('averages what the reader came in with, leaving out after-session moods', () => {
    expect(moodOfDay(entries, '2026-09-09')).toBe(3);
    expect(moodOfDay(entries, '2026-09-10')).toBeNull();
  });

  it('measures the change across sittings from complete pairs only', () => {
    const shift = moodShift([
      ...entries,
      mood({ id: 'q:before', score: 2, context: 'before', pairId: 'q' }),
      mood({ id: 'q:after', score: 2, context: 'after', pairId: 'q' }),
      mood({ id: 'r:before', score: 4, context: 'before', pairId: 'r' }),
      mood({ id: 's:after', score: 1, context: 'after', pairId: 's' }),
    ]);
    expect(shift).toEqual({ pairs: 2, average: 1, better: 1, same: 1, worse: 0 });
  });
});

describe('a session for a mood', () => {
  it('offers something for every point on the scale', () => {
    for (const level of moodLevels) expect(sessionForMood(level.value), level.label).not.toBeNull();
  });
});
