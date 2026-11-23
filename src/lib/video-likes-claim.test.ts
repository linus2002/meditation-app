import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as VideoLikes from '@/lib/video-likes';

/*
 * A guest likes clips under an anonymous account; signing in replaces it. The
 * likes must move to the account: unliked as the guest (or they count twice)
 * and liked as the member.
 */

const ANON = 'anon-token';
let session: { access_token: string; user: { id: string; is_anonymous: boolean; email?: string } } | null;
const memberRpc = vi.fn(async (_name: string, args: { v: string; liked: boolean }) => ({ data: args.liked ? 1 : 0, error: null }));
const signInAnonymously = vi.fn(async () => {
  await new Promise((done) => setTimeout(done, 10));
  session = { access_token: 'new-anon', user: { id: `anon-${signInAnonymously.mock.calls.length}`, is_anonymous: true } };
  return { error: null };
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session } }), signInAnonymously },
    rpc: memberRpc,
  }),
}));
let reader = 'guest';
vi.mock('@/lib/account-scope', () => ({
  personalKey: (key: string) => `${key}:${reader}`,
  personalAccountId: () => (reader === 'guest' ? null : reader),
  isThisReader: (user?: { id: string; is_anonymous?: boolean }) =>
    reader === 'guest' ? !user || user.is_anonymous === true : user?.id === reader,
}));

const anonCalls: { url: string; auth: string | null; body: string | null }[] = [];
let anonLikes = ['love', 'calm'];

let likes: typeof VideoLikes;
let local: Map<string, string>;
let tab: Map<string, string>;

beforeEach(async () => {
  vi.resetModules();
  memberRpc.mockClear();
  signInAnonymously.mockClear();
  anonCalls.length = 0;
  anonLikes = ['love', 'calm'];
  local = new Map();
  tab = new Map();
  const store = (map: Map<string, string>) => ({
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  });
  vi.stubGlobal('localStorage', store(local));
  vi.stubGlobal('window', { localStorage: store(local), sessionStorage: store(tab) });
  vi.stubGlobal('fetch', async (url: string, init: { method?: string; headers: Record<string, string>; body?: string }) => {
    anonCalls.push({ url, auth: init.headers.Authorization ?? null, body: init.body ?? null });
    if (url.includes('/video_likes?')) return new Response(JSON.stringify(anonLikes.map((video_id) => ({ video_id }))));
    if (url.includes('/rpc/set_video_like')) return new Response('0');
    return new Response('{}', { status: 404 });
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable';
  likes = await import('@/lib/video-likes');
});

describe('two quick first likes', () => {
  it('share one anonymous account', async () => {
    session = null;
    await Promise.all([likes.saveLike('a', true), likes.saveLike('b', true)]);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});

describe('a guest who signs in', () => {
  it('takes their likes along, without counting them twice', async () => {
    reader = 'guest';
    session = { access_token: ANON, user: { id: 'anon-1', is_anonymous: true } };
    await likes.rememberGuestLikes();

    // The sign-in: a fresh page for the member.
    reader = 'member-1';
    session = { access_token: 'member', user: { id: 'member-1', is_anonymous: false, email: 'm@example.com' } };
    vi.resetModules();
    likes = await import('@/lib/video-likes');
    await likes.claimGuestLikes(() => {});

    const unliked = anonCalls.filter((call) => call.url.includes('/rpc/set_video_like'));
    expect(unliked.every((call) => call.auth === `Bearer ${ANON}` && JSON.parse(call.body!).liked === false)).toBe(true);
    expect(unliked.map((call) => JSON.parse(call.body!).v).sort()).toEqual(['calm', 'love']);
    expect(memberRpc.mock.calls.map(([, args]) => [args.v, args.liked]).sort()).toEqual([
      ['calm', true],
      ['love', true],
    ]);
    // Only once.
    memberRpc.mockClear();
    await likes.claimGuestLikes(() => {});
    expect(memberRpc).not.toHaveBeenCalled();
  });

  it('leaves likes alone when the guest had none to move', async () => {
    reader = 'guest';
    session = null;
    await likes.rememberGuestLikes();
    reader = 'member-1';
    session = { access_token: 'member', user: { id: 'member-1', is_anonymous: false, email: 'm@example.com' } };
    await likes.claimGuestLikes(() => {});
    expect(anonCalls).toEqual([]);
    expect(memberRpc).not.toHaveBeenCalled();
  });
});
