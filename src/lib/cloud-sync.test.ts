import { describe, expect, it } from 'vitest';

import { mergeSessionLists, sessionsToSend } from '@/lib/cloud-sync';
import { mergeResumeMaps } from '@/lib/resume';
import type { SessionRecord } from '@/types';

const sit = (id: string, seconds: number, completed = false, startedAt = 1): SessionRecord => ({
  id,
  meditationId: 'open-heart',
  date: '2026-11-12',
  seconds,
  completed,
  startedAt,
});

describe('mergeSessionLists', () => {
  it('keeps one copy of each sitting, the longer one, finished if either was', () => {
    const merged = mergeSessionLists([sit('a', 60), sit('b', 300, true)], [sit('a', 120), sit('b', 200)]);
    expect(merged.find((s) => s.id === 'a')?.seconds).toBe(120);
    expect(merged.find((s) => s.id === 'b')).toMatchObject({ seconds: 300, completed: true });
    expect(merged).toHaveLength(2);
  });

  it('adds sittings from the other phone, newest first', () => {
    const merged = mergeSessionLists([sit('a', 60, false, 1)], [sit('c', 60, false, 3)]);
    expect(merged.map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('sessionsToSend', () => {
  it('sends only what the account lacks or holds a lesser copy of', () => {
    const local = [sit('a', 60), sit('b', 120), sit('c', 90, true), sit('d', 30)];
    const remote = [sit('a', 60), sit('b', 60), sit('c', 90, false)];
    expect(sessionsToSend(local, remote).map((s) => s.id)).toEqual(['b', 'c', 'd']);
  });
});

describe('mergeResumeMaps', () => {
  it('keeps the newer place for each session and reports what to send up', () => {
    const local = { a: { seconds: 60, savedAt: 10 }, b: { seconds: 30, savedAt: 1 } };
    const remote = { b: { seconds: 90, savedAt: 5 }, c: { seconds: 45, savedAt: 3 } };
    const { merged, newerLocally } = mergeResumeMaps(local, remote);
    expect(merged).toEqual({
      a: { seconds: 60, savedAt: 10 },
      b: { seconds: 90, savedAt: 5 },
      c: { seconds: 45, savedAt: 3 },
    });
    expect(newerLocally).toEqual({ a: { seconds: 60, savedAt: 10 } });
  });

  it('never sends a support-track place up', () => {
    const { newerLocally } = mergeResumeMaps({ 'support:scan-day': { seconds: 60, savedAt: 9 } }, {});
    expect(newerLocally).toEqual({});
  });
});
