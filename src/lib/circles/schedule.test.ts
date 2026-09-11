import { describe, expect, it } from 'vitest';

import {
  canJoin,
  circleReminderDue,
  currentOrNextOccurrence,
  joinOffsetSeconds,
  livePhase,
  upcomingOccurrences,
} from '@/lib/circles/schedule';
import type { CircleSchedule, Occurrence } from '@/lib/circles/types';

const earlyLight: CircleSchedule = {
  tz: 'Europe/London',
  sessionTime: '07:00',
  sessionDays: [1, 2, 3, 4, 5, 6, 7],
  durationSeconds: 900,
};

// Thursday 15 January 2026, London on GMT.
const at = (hours: number, minutes = 0, seconds = 0) =>
  Date.UTC(2026, 0, 15, hours, minutes, seconds);

const todays: Occurrence = {
  startsAt: at(7),
  endsAt: at(7, 15),
  dateKey: '2026-01-15',
};

describe('currentOrNextOccurrence', () => {
  it('finds today’s sitting before it starts', () => {
    expect(currentOrNextOccurrence(earlyLight, at(6))).toEqual(todays);
  });

  it('keeps returning today’s sitting while it runs', () => {
    expect(currentOrNextOccurrence(earlyLight, at(7, 10))).toEqual(todays);
  });

  it('rolls to tomorrow once the sitting has ended', () => {
    expect(currentOrNextOccurrence(earlyLight, at(7, 20))?.startsAt).toBe(
      Date.UTC(2026, 0, 16, 7),
    );
  });

  it('skips days the circle does not meet', () => {
    const weekdays = { ...earlyLight, sessionDays: [1, 3, 5] }; // Mon, Wed, Fri
    expect(currentOrNextOccurrence(weekdays, at(6))?.dateKey).toBe('2026-01-16');
  });

  it('finds a late sitting still running past midnight', () => {
    const lateNight: CircleSchedule = {
      tz: 'America/New_York',
      sessionTime: '23:50',
      sessionDays: [1, 2, 3, 4, 5, 6, 7],
      durationSeconds: 1200,
    };
    // 00:05 on the 16th in New York: the sitting from the 15th is still on.
    const now = Date.UTC(2026, 0, 16, 5, 5);
    const occurrence = currentOrNextOccurrence(lateNight, now);
    expect(occurrence?.dateKey).toBe('2026-01-15');
    expect(occurrence && livePhase(occurrence, now)).toBe('closing');
  });

  it('returns nothing for a circle that never meets', () => {
    expect(currentOrNextOccurrence({ ...earlyLight, sessionDays: [] }, at(6))).toBeNull();
  });
});

describe('upcomingOccurrences', () => {
  it('keeps the wall-clock time across the spring change', () => {
    // Friday 27 March; London moves to BST on Sunday the 29th.
    const now = Date.UTC(2026, 2, 27, 12);
    expect(upcomingOccurrences(earlyLight, now, 3).map((entry) => entry.startsAt)).toEqual([
      Date.UTC(2026, 2, 28, 7),
      Date.UTC(2026, 2, 29, 6),
      Date.UTC(2026, 2, 30, 6),
    ]);
  });
});

describe('livePhase', () => {
  it('walks through every stage of a sitting', () => {
    expect(livePhase(todays, at(6, 54, 59))).toBe('upcoming');
    expect(livePhase(todays, at(6, 55))).toBe('lobby');
    expect(livePhase(todays, at(7))).toBe('live');
    expect(livePhase(todays, at(7, 7, 29))).toBe('live');
    expect(livePhase(todays, at(7, 7, 30))).toBe('closing');
    expect(livePhase(todays, at(7, 15))).toBe('ended');
  });

  it('only lets people in while the room is open', () => {
    expect(canJoin('lobby')).toBe(true);
    expect(canJoin('live')).toBe(true);
    expect(canJoin('closing')).toBe(false);
    expect(canJoin('upcoming')).toBe(false);
  });
});

describe('joinOffsetSeconds', () => {
  it('starts late arrivals where everyone else is', () => {
    expect(joinOffsetSeconds(todays, at(7, 2))).toBe(120);
  });

  it('never goes before the start or past the end', () => {
    expect(joinOffsetSeconds(todays, at(6, 58))).toBe(0);
    expect(joinOffsetSeconds(todays, at(8))).toBe(900);
  });
});

describe('circleReminderDue', () => {
  it('fires only in the ten minutes before the start', () => {
    expect(circleReminderDue(todays, at(6, 49, 59), false)).toBe(false);
    expect(circleReminderDue(todays, at(6, 50), false)).toBe(true);
    expect(circleReminderDue(todays, at(6, 59), false)).toBe(true);
    expect(circleReminderDue(todays, at(7), false)).toBe(false);
  });

  it('never fires twice', () => {
    expect(circleReminderDue(todays, at(6, 55), true)).toBe(false);
  });
});
