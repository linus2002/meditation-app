import { describe, expect, it } from 'vitest';

import { msUntilNextDay } from '@/lib/date';
import { pruneSchedules, type ScheduledSession } from '@/lib/schedule';
import { withStoryFinished } from '@/lib/story-finishes';

describe('msUntilNextDay', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 10, 23, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextDay(new Date(2026, 10, 23, 0, 0, 0))).toBe(24 * 3600_000);
  });
});

const entry = (id: string, date: string, repeat: ScheduledSession['repeat'] = 'once'): ScheduledSession => ({
  id,
  kind: 'meditation',
  itemId: 'open-heart',
  date,
  time: '07:00',
  repeat,
  createdAt: 1,
});

describe('pruneSchedules', () => {
  const now = new Date(2026, 10, 23, 12, 0, 0);

  it('tidies away one-offs more than a month past', () => {
    const kept = pruneSchedules([entry('old', '2026-10-01'), entry('recent', '2026-11-10'), entry('soon', '2026-11-30')], now);
    expect(kept.map((item) => item.id)).toEqual(['recent', 'soon']);
  });

  it('keeps repeating schedules however old', () => {
    expect(pruneSchedules([entry('daily', '2026-01-01', 'daily')], now)).toHaveLength(1);
  });
});

describe('withStoryFinished', () => {
  it('notes a story as finished on a day, once', () => {
    const once = withStoryFinished({}, '2026-11-23', 'lighthouse');
    expect(withStoryFinished(once, '2026-11-23', 'lighthouse')).toEqual({ '2026-11-23': ['lighthouse'] });
  });

  it('forgets days long gone', () => {
    const log = withStoryFinished({ '2026-08-01': ['night-ferry'] }, '2026-11-23', 'lighthouse');
    expect(Object.keys(log)).toEqual(['2026-11-23']);
  });
});
