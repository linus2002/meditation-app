import { describe, expect, it } from 'vitest';

import { pendingCheckins, type MyCircleRef } from '@/lib/circles/checkins';
import type { SessionRecord } from '@/types';

const circle: MyCircleRef = {
  id: 'c1',
  tz: 'Europe/London',
  joinedAt: Date.UTC(2026, 0, 14, 10),
};

const now = Date.UTC(2026, 0, 15, 20);

function session(id: string, startedAt: number, seconds = 600, circleId?: string): SessionRecord {
  return {
    id,
    meditationId: 'morning-clarity',
    date: '2026-01-15',
    seconds,
    completed: true,
    startedAt,
    circleId,
  };
}

const sessions: SessionRecord[] = [
  session('live-sit', Date.UTC(2026, 0, 15, 7), 900, 'c1'),
  session('solo-sit', Date.UTC(2026, 0, 15, 12), 300),
  session('join-day', Date.UTC(2026, 0, 14, 9)),
  session('before-joining', Date.UTC(2026, 0, 13, 9)),
  session('too-short', Date.UTC(2026, 0, 15, 15), 30),
];

describe('pendingCheckins', () => {
  it('sends one check-in per circle-local day, marked live if any sit was', () => {
    expect(
      pendingCheckins({ sessions, circles: [circle], acked: [], now, minSeconds: 60 }),
    ).toEqual([
      {
        circleId: 'c1',
        localDate: '2026-01-14',
        satAt: Date.UTC(2026, 0, 14, 9),
        live: false,
        ackKeys: ['c1:join-day'],
      },
      {
        circleId: 'c1',
        localDate: '2026-01-15',
        satAt: Date.UTC(2026, 0, 15, 7),
        live: true,
        ackKeys: ['c1:live-sit', 'c1:solo-sit'],
      },
    ]);
  });

  it('skips sits already delivered', () => {
    const pending = pendingCheckins({
      sessions,
      circles: [circle],
      acked: ['c1:join-day', 'c1:live-sit', 'c1:solo-sit'],
      now,
      minSeconds: 60,
    });
    expect(pending).toEqual([]);
  });

  it('does not back-fill sits older than 36 hours', () => {
    const later = Date.UTC(2026, 0, 15, 22); // join-day sit is now 37h old
    const dates = pendingCheckins({ sessions, circles: [circle], acked: [], now: later, minSeconds: 60 })
      .map((entry) => entry.localDate);
    expect(dates).toEqual(['2026-01-15']);
  });

  it('has nothing to send without a circle', () => {
    expect(pendingCheckins({ sessions, circles: [], acked: [], now, minSeconds: 60 })).toEqual([]);
  });
});
