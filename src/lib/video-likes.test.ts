import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as VideoLikes from '@/lib/video-likes';

const rpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: {} } }) },
    rpc,
  }),
}));

/** The pending list lives in the module, so each test gets a fresh copy. */
let likes: typeof VideoLikes;

beforeEach(async () => {
  vi.resetModules();
  rpc.mockReset();
  likes = await import('@/lib/video-likes');
});

/** A request held open until the test answers it. */
function heldRequest() {
  let answer!: (result: { data: number | null; error: unknown }) => void;
  const promise = new Promise((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
}

describe('formatLikeCount', () => {
  it('shows small counts as they are', () => {
    expect(likes.formatLikeCount(0)).toBe('0');
    expect(likes.formatLikeCount(999)).toBe('999');
  });

  it('shortens thousands and millions, rounding down', () => {
    expect(likes.formatLikeCount(1000)).toBe('1K');
    expect(likes.formatLikeCount(1290)).toBe('1.2K');
    expect(likes.formatLikeCount(15_800)).toBe('15K');
    expect(likes.formatLikeCount(2_550_000)).toBe('2.5M');
  });
});

describe('queued likes', () => {
  it('keeps a like the server never received, and sends it again', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    const onTotal = vi.fn();

    await likes.queueLike('love', true, onTotal);
    expect(onTotal).not.toHaveBeenCalled();
    // The server's list doesn't have it yet; the heart must not vanish.
    expect(likes.withPendingLikes(['autopilot'])).toEqual(['autopilot', 'love']);

    rpc.mockResolvedValueOnce({ data: 8, error: null });
    await likes.flushPendingLikes(onTotal);
    expect(onTotal).toHaveBeenCalledWith('love', 8);
    expect(likes.withPendingLikes(['autopilot'])).toEqual(['autopilot']);
  });

  it('keeps an unlike the server never received', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });

    await likes.queueLike('love', false, vi.fn());
    expect(likes.withPendingLikes(['love', 'autopilot'])).toEqual(['autopilot']);
  });

  it('sends rapid taps one at a time and reports only the final total', async () => {
    const first = heldRequest();
    const second = heldRequest();
    rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const onTotal = vi.fn();

    const liking = likes.queueLike('love', true, onTotal);
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    await likes.queueLike('love', false, onTotal);
    expect(rpc).toHaveBeenCalledTimes(1);

    first.answer({ data: 6, error: null });
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc.mock.calls.map(([, args]) => args.liked)).toEqual([true, false]);
    expect(onTotal).not.toHaveBeenCalled();

    second.answer({ data: 5, error: null });
    await liking;
    expect(onTotal).toHaveBeenCalledTimes(1);
    expect(onTotal).toHaveBeenCalledWith('love', 5);
  });
});
