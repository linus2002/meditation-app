import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Ratings from '@/lib/ratings';

/*
 * A stand-in for the deployed `set_meditation_rating`, which toggles: sending
 * the score it already holds deletes it.
 */
let server: Record<string, number>;
let offline: boolean;
let duringFetch: (() => void) | undefined;
let user: string;
const writes: [string, number | null][] = [];

const rpc = vi.fn(async (name: string, args?: { mid: string; score: number | null }) => {
  if (offline) return { data: null, error: { message: 'offline' } };
  if (name === 'my_meditation_ratings') {
    const data = Object.entries(server).map(([id, score]) => ({ meditation_id: id, score }));
    duringFetch?.();
    duringFetch = undefined;
    return { data, error: null };
  }
  const { mid, score } = args!;
  writes.push([user, score]);
  if (score === null || server[mid] === score) {
    delete server[mid];
    return { data: null, error: null };
  }
  server[mid] = score;
  return { data: score, error: null };
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: user } } } }) },
    rpc,
  }),
}));
vi.mock('@/lib/account-scope', () => ({
  personalKey: (key: string) => `${key}:anna`,
  personalAccountId: () => 'anna',
  isThisReader: (who?: { id: string }) => who?.id === 'anna',
}));

let ratings: typeof Ratings;
let store: Map<string, string>;

/** A fresh page on the same phone. */
async function relaunch() {
  vi.resetModules();
  ratings = await import('@/lib/ratings');
}

beforeEach(async () => {
  server = {};
  offline = false;
  user = 'anna';
  duringFetch = undefined;
  writes.length = 0;
  rpc.mockClear();
  store = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  });
  await relaunch();
});

describe('saving a rating', () => {
  it('keeps a score the account already holds', async () => {
    server = { calm: 4 };
    await ratings.queueRating('calm', 4);
    expect(server).toEqual({ calm: 4 });
  });

  it('keeps it however often it is sent', async () => {
    await ratings.queueRating('calm', 4);
    await ratings.queueRating('calm', 4);
    expect(server).toEqual({ calm: 4 });
  });

  it('clears', async () => {
    server = { calm: 4 };
    await ratings.queueRating('calm', null);
    expect(server).toEqual({});
  });

  it('ends on the last of several quick taps', async () => {
    await Promise.all([2, 3, 4, 5].map((score) => ratings.queueRating('calm', score)));
    expect(server).toEqual({ calm: 5 });
  });

  it('sends one given offline after a relaunch', async () => {
    offline = true;
    await ratings.queueRating('calm', 3);
    expect(server).toEqual({});

    offline = false;
    await relaunch();
    expect(await ratings.loadRatings(() => ({ calm: 3 }))).toEqual({ calm: 3 });
    expect(server).toEqual({ calm: 3 });
  });

  it('never writes into another account', async () => {
    user = 'ben';
    await ratings.queueRating('calm', 3);
    expect(writes).toEqual([]);
  });

  it('stops half-way if the account changes between the two calls', async () => {
    server = { calm: 4 };
    rpc.mockImplementationOnce(async () => {
      user = 'ben';
      return { data: null, error: null };
    });
    await ratings.queueRating('calm', 5);
    expect(writes.filter(([who]) => who === 'ben')).toEqual([]);
  });
});

describe('loading ratings', () => {
  it('sends up, once, ratings from before any of this worked', async () => {
    expect(await ratings.loadRatings(() => ({ calm: 4 }))).toEqual({ calm: 4 });
    expect(server).toEqual({ calm: 4 });
  });

  it('then lets a clear from another phone stick', async () => {
    await ratings.loadRatings(() => ({ calm: 4 }));
    server = {};
    expect(await ratings.loadRatings(() => ({ calm: 4 }))).toEqual({});
    expect(server).toEqual({});
  });

  it('does not bring back a clear made offline', async () => {
    server = { calm: 4 };
    await ratings.loadRatings(() => ({ calm: 4 }));
    offline = true;
    await ratings.queueRating('calm', null);
    offline = false;
    await relaunch();
    expect(await ratings.loadRatings(() => ({}))).toEqual({});
  });

  it('keeps a rating given while the list was loading', async () => {
    duringFetch = () => void ratings.queueRating('calm', 5);
    expect(await ratings.loadRatings(() => ({}))).toEqual({ calm: 5 });
  });

  it('changes nothing when it cannot reach the account', async () => {
    offline = true;
    expect(await ratings.loadRatings(() => ({ calm: 4 }))).toBeNull();
  });
});
