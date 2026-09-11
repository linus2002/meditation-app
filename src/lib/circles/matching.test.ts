import { describe, expect, it } from 'vitest';

import { isSleepingHour, recommendCircles, timeBandOf } from '@/lib/circles/matching';
import type { Circle, Intake } from '@/lib/circles/types';

function circle(overrides: Partial<Circle> & Pick<Circle, 'slug'>): Circle {
  return {
    id: overrides.slug,
    name: overrides.slug,
    description: '',
    goal: 'calm',
    timeBand: 'morning',
    level: 'all',
    tz: 'Europe/London',
    sessionTime: '07:00',
    sessionDays: [1, 2, 3, 4, 5, 6, 7],
    meditationId: 'morning-clarity',
    durationSeconds: 900,
    capacity: 20,
    memberCount: 0,
    status: 'open',
    ...overrides,
  };
}

const catalogue: Circle[] = [
  circle({ slug: 'early-light-london' }),
  circle({ slug: 'midday-reset-london', sessionTime: '12:30', goal: 'focus', durationSeconds: 300 }),
  circle({ slug: 'evening-unwind-london', sessionTime: '19:00', durationSeconds: 720 }),
  circle({ slug: 'before-sleep-london', sessionTime: '22:00', goal: 'sleep', durationSeconds: 1200 }),
  circle({ slug: 'early-light-ny', tz: 'America/New_York' }),
  circle({ slug: 'before-sleep-ny', tz: 'America/New_York', sessionTime: '22:00', goal: 'sleep' }),
];

const calmMornings: Intake = { goal: 'calm', time: 'morning', experience: 'new' };

// Thursday 15 January 2026, 06:00 in London.
const now = Date.UTC(2026, 0, 15, 6);

const slugs = (intake: Intake, circles = catalogue, userTz = 'Europe/London') =>
  recommendCircles({ intake, userTz, now, circles }).map((entry) => entry.circle.slug);

describe('timeBandOf', () => {
  it('splits the day into four bands', () => {
    expect(timeBandOf('05:00')).toBe('morning');
    expect(timeBandOf('10:59')).toBe('morning');
    expect(timeBandOf('11:00')).toBe('midday');
    expect(timeBandOf('16:00')).toBe('evening');
    expect(timeBandOf('21:00')).toBe('night');
    expect(timeBandOf('04:59')).toBe('night');
  });

  it('knows which hours are for sleeping', () => {
    expect(isSleepingHour('23:00')).toBe(true);
    expect(isSleepingHour('03:00')).toBe(true);
    expect(isSleepingHour('05:00')).toBe(false);
  });
});

describe('recommendCircles', () => {
  it('puts time of day first, then goal, and returns at most three', () => {
    expect(slugs(calmMornings)).toEqual([
      'early-light-london',
      'early-light-ny', // 12:00 in London: next band over, same goal
      'evening-unwind-london',
    ]);
  });

  it('explains itself in the reader’s own time', () => {
    const [top] = recommendCircles({ intake: calmMornings, userTz: 'Europe/London', now, circles: catalogue });
    expect(top.localTime).toBe('07:00');
    expect(top.reasons).toContain('time');
    expect(top.reasons).toContain('goal');
  });

  it('never suggests a circle that meets while the reader sleeps', () => {
    // 22:00 in New York is 03:00 in London.
    expect(slugs({ ...calmMornings, goal: 'sleep' })).not.toContain('before-sleep-ny');
    // And a London 07:00 circle is 02:00 in New York.
    expect(slugs(calmMornings, catalogue, 'America/New_York')).not.toContain('early-light-london');
  });

  it('does suggest late circles to someone who asked for night', () => {
    const results = slugs({ goal: 'sleep', time: 'night', experience: 'regular' });
    expect(results).toContain('before-sleep-ny');
  });

  it('leaves out circles that are full, closed or already joined', () => {
    const circles = [
      circle({ slug: 'full', memberCount: 20 }),
      circle({ slug: 'closed', status: 'closed' }),
      circle({ slug: 'mine' }),
      circle({ slug: 'open' }),
    ];
    const results = recommendCircles({
      intake: calmMornings,
      userTz: 'Europe/London',
      now,
      circles,
      joinedIds: ['mine'],
    });
    expect(results.map((entry) => entry.circle.slug)).toEqual(['open']);
  });

  it('prefers a circle people have already joined, so early members gather', () => {
    const circles = [circle({ slug: 'a-empty' }), circle({ slug: 'b-gathering', memberCount: 4 })];
    expect(slugs(calmMornings, circles)).toEqual(['b-gathering', 'a-empty']);
  });

  it('breaks ties the same way every time', () => {
    const circles = [circle({ slug: 'b' }), circle({ slug: 'a' })];
    expect(slugs(calmMornings, circles)).toEqual(['a', 'b']);
  });

  it('returns nothing rather than inventing a match', () => {
    expect(slugs(calmMornings, [])).toEqual([]);
  });
});
