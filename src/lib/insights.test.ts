import { describe, expect, it } from 'vitest';

import {
  compareSleep,
  daysOfMonth,
  formatShift,
  formatTotal,
  monthInsights,
  shiftMonth,
  timeOfDay,
} from '@/lib/insights';
import type { MoodEntry, SessionRecord, SleepLog } from '@/types';

const TODAY = new Date(2026, 8, 16, 20); // Wed 16 Sep 2026, evening

let counter = 0;
const sit = (date: string, minutes: number, hour = 7, meditationId = 'body-scan'): SessionRecord => {
  const [y, m, d] = date.split('-').map(Number);
  return {
    id: `i${counter++}`,
    meditationId,
    date,
    seconds: minutes * 60,
    completed: true,
    startedAt: new Date(y, m - 1, d, hour).getTime(),
  };
};
const night = (date: string, quality: number): SleepLog => ({
  date,
  bedtime: '22:30',
  wakeTime: '06:30',
  quality,
  updatedAt: 0,
});
const feel = (id: string, date: string, score: number, context: MoodEntry['context'] = 'checkin', pairId?: string): MoodEntry => ({
  id,
  date,
  at: 0,
  score,
  context,
  pairId,
});

describe('months', () => {
  it('steps across years and knows each month’s length', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(daysOfMonth('2026-02')).toHaveLength(28);
    expect(daysOfMonth('2028-02')).toHaveLength(29);
    expect(daysOfMonth('2026-09')[0]).toBe('2026-09-01');
  });

  it('formats totals and changes plainly', () => {
    expect(formatTotal(200 * 60)).toBe('3h 20m');
    expect(formatTotal(45 * 60)).toBe('45m');
    expect(formatTotal(120 * 60)).toBe('2h');
    expect(formatShift(0.84)).toBe('+0.8');
    expect(formatShift(-1.25)).toBe('−1.3');
    expect(formatShift(0.02)).toBe('0');
  });

  it('names the time of day', () => {
    const at = (hour: number) => new Date(2026, 8, 9, hour).getTime();
    expect([6, 13, 19, 23, 2].map((hour) => timeOfDay(at(hour)))).toEqual([
      'morning',
      'afternoon',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('monthInsights', () => {
  const sessions = [
    sit('2026-09-01', 10),
    sit('2026-09-02', 20),
    sit('2026-09-02', 5, 21, 'box-breathing'),
    sit('2026-09-08', 30),
    sit('2026-09-09', 15, 13, 'box-breathing'),
    sit('2026-08-20', 10),
  ];
  const moods = [
    feel('c1', '2026-09-01', 2),
    feel('c2', '2026-09-08', 4),
    feel('a:before', '2026-09-08', 2, 'before', 'a'),
    feel('a:after', '2026-09-08', 4, 'after', 'a'),
    feel('old', '2026-08-20', 1),
  ];
  const insights = monthInsights({ sessions, moods, sleepLogs: [], weeklyGoalDays: 2 }, '2026-09', TODAY);

  it('totals the month and compares it with the one before', () => {
    expect(insights).toMatchObject({ sessions: 5, seconds: 80 * 60, daysSat: 4, longestSeconds: 30 * 60 });
    expect(insights.previous).toEqual({ sessions: 1, seconds: 600 });
  });

  it('names the favourite and the usual time', () => {
    expect(insights.favourite).toEqual({ meditationId: 'body-scan', count: 3 });
    expect(insights.usualTime).toBe('morning');
  });

  it('reads mood by day and across sittings, within the month only', () => {
    expect(insights.days).toHaveLength(30);
    expect(insights.days[0].mood).toBe(2);
    expect(insights.days[7].mood).toBe(3); // check-in 4 and before 2
    expect(insights.days[20].future).toBe(true);
    expect(insights.moodDays).toBe(2);
    expect(insights.averageMood).toBe(2.5);
    expect(insights.shift).toMatchObject({ pairs: 1, average: 2 });
  });

  it('counts the weeks begun in the month against the weekly goal', () => {
    // Mondays 7 and 14 so far; the week of the 7th has two days sat.
    expect(insights.weeks).toEqual({ total: 2, met: 1 });
  });

  it('says nothing about a favourite or a habit from too little', () => {
    const thin = monthInsights({ sessions: [sit('2026-09-03', 10)], moods: [], sleepLogs: [], weeklyGoalDays: 3 }, '2026-09', TODAY);
    expect(thin.favourite).toBeNull();
    expect(thin.usualTime).toBeNull();
    expect(thin.averageMood).toBeNull();
  });
});

describe('compareSleep', () => {
  // A night is keyed by the morning you woke, so it follows the day before.
  const sessions = [sit('2026-09-01', 10), sit('2026-09-02', 10), sit('2026-09-03', 10)];

  it('waits for enough nights on both sides', () => {
    expect(compareSleep(sessions, [night('2026-09-02', 5), night('2026-09-03', 5)], '2026-09')).toBeNull();
  });

  it('compares nights after a day sat with nights after a day not', () => {
    const logs = [
      night('2026-09-02', 4),
      night('2026-09-03', 5),
      night('2026-09-04', 4),
      night('2026-09-10', 3),
      night('2026-09-11', 2),
      night('2026-09-12', 3),
    ];
    const result = compareSleep(sessions, logs, '2026-09');
    expect(result).toMatchObject({ nightsWith: 3, nightsWithout: 3 });
    expect(result?.withPractice).toBeCloseTo(13 / 3);
    expect(result?.without).toBeCloseTo(8 / 3);
  });
});
