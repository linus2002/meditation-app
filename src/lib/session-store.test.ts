import { describe, expect, it } from 'vitest';

import { saveSessionNow, withSession } from '@/lib/session-store';
import type { SessionRecord } from '@/types';

const sit = (id: string, seconds: number): SessionRecord => ({
  id,
  meditationId: 'open-heart',
  date: '2026-11-23',
  seconds,
  completed: false,
  startedAt: 1,
});

function storage(value?: string) {
  let saved = value ?? null;
  return {
    getItem: () => saved,
    setItem: (_key: string, next: string) => {
      saved = next;
    },
    read: () => JSON.parse(saved!),
  };
}

describe('withSession', () => {
  it('replaces a sitting rather than counting it twice', () => {
    expect(withSession([sit('a', 60), sit('b', 90)], sit('a', 120))).toEqual([sit('a', 120), sit('b', 90)]);
  });
});

describe('saveSessionNow', () => {
  it('is in storage the moment it returns', () => {
    const store = storage();
    saveSessionNow(store, 'state', sit('a', 70));
    expect(store.read().sessions).toEqual([sit('a', 70)]);
  });

  it('touches nothing else that is saved', () => {
    const store = storage(JSON.stringify({ name: 'Anna', reflections: [1], sessions: [sit('b', 90)] }));
    saveSessionNow(store, 'state', sit('a', 70));
    expect(store.read()).toEqual({ name: 'Anna', reflections: [1], sessions: [sit('a', 70), sit('b', 90)] });
  });

  it('survives storage that refuses', () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => saveSessionNow(store, 'state', sit('a', 70))).not.toThrow();
  });
});
