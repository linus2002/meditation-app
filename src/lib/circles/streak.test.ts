import { describe, expect, it } from 'vitest';

import { groupStreak, neededToday, quorumFor } from '@/lib/circles/streak';

describe('groupStreak', () => {
  it('counts back from yesterday while today has not counted yet', () => {
    expect(groupStreak(['2026-01-14', '2026-01-13', '2026-01-12'], '2026-01-15')).toBe(3);
  });

  it('includes today once it counts', () => {
    expect(groupStreak(['2026-01-15', '2026-01-14'], '2026-01-15')).toBe(2);
  });

  it('stops at the first gap', () => {
    expect(groupStreak(['2026-01-15', '2026-01-13'], '2026-01-15')).toBe(1);
  });

  it('is zero once neither today nor yesterday counted', () => {
    expect(groupStreak(['2026-01-13'], '2026-01-15')).toBe(0);
    expect(groupStreak([], '2026-01-15')).toBe(0);
  });

  it('does not care about order or duplicates', () => {
    expect(groupStreak(['2026-01-13', '2026-01-14', '2026-01-14'], '2026-01-15')).toBe(2);
  });

  it('runs across a month end', () => {
    expect(groupStreak(['2026-03-01', '2026-02-28'], '2026-03-01')).toBe(2);
  });
});

describe('quorumFor', () => {
  it('asks for three, or everyone in a smaller circle', () => {
    expect(quorumFor(0)).toBe(1);
    expect(quorumFor(1)).toBe(1);
    expect(quorumFor(2)).toBe(2);
    expect(quorumFor(3)).toBe(3);
    expect(quorumFor(20)).toBe(3);
  });
});

describe('neededToday', () => {
  it('counts down to zero and stays there', () => {
    expect(neededToday(2, 20)).toBe(1);
    expect(neededToday(5, 20)).toBe(0);
    expect(neededToday(0, 1)).toBe(1);
  });
});
