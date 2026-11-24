import { describe, expect, it, vi } from 'vitest';

import { syncSessions } from '@/lib/cloud-sync';
import type { SessionRecord } from '@/types';

const upserts: { id: string; seconds: number }[][] = [];
let duringFetch = () => {};

vi.mock('@/lib/account-scope', () => ({ isThisReader: () => true, personalKey: (key: string) => key }));
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: 'anna', email: 'a@example.test' } } } }) },
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => {
            duringFetch();
            return { data: [], error: null };
          },
        }),
      }),
      upsert: async (rows: { id: string; seconds: number }[]) => {
        upserts.push(rows);
        return { error: null };
      },
    }),
  }),
}));

const sit = (id: string, seconds: number): SessionRecord => ({
  id,
  meditationId: 'open-heart',
  date: '2026-11-23',
  seconds,
  completed: false,
  startedAt: 1,
});

describe('syncSessions', () => {
  it('works from the history as it is when the account answers, not when it was asked', async () => {
    let local = [sit('a', 60)];
    duringFetch = () => {
      local = [sit('a', 300), sit('b', 120)];
    };

    const merged = await syncSessions(() => local);

    expect(upserts[0].map(({ id, seconds }) => [id, seconds])).toEqual([
      ['a', 300],
      ['b', 120],
    ]);
    expect(merged).toHaveLength(2);
  });
});
