import { getSupabase } from '@/lib/supabase/client';

/*
 * Shared like counts for the home videos (supabase/migrations/…_video_likes.sql).
 *
 * Reading counts needs no account. Liking needs one, so the first like signs
 * the person in anonymously, as joining a circle does; nobody who only watches
 * gets an account. Every call here fails quietly: without keys, offline or on
 * any server error the feed falls back to likes kept on this phone alone.
 *
 * A like is noted as pending the moment it is tapped and cleared once the server
 * has it, so one that could not be saved is sent again next time rather than
 * being wiped by the server's older list.
 */
const PENDING_KEY = 'serenity.likedVideos.pending.v1';

/** Like totals by video id. Clips nobody has liked are left out. */
export async function fetchLikeCounts(ids: string[]): Promise<Record<string, number> | null> {
  const client = getSupabase();
  if (!client || ids.length === 0) return null;

  const { data, error } = await client.rpc('video_like_counts', { ids });
  if (error || !Array.isArray(data)) return null;

  const counts: Record<string, number> = {};
  for (const row of data as { video_id: string; likes: number }[]) counts[row.video_id] = row.likes;
  return counts;
}

/** The clips this person has liked, if they already have an account. Never signs anyone in. */
export async function fetchMyLikes(): Promise<string[] | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data: session } = await client.auth.getSession();
  if (!session.session) return null;

  const { data, error } = await client.from('video_likes').select('video_id');
  if (error || !data) return null;
  return (data as { video_id: string }[]).map((row) => row.video_id);
}

/** Likes or unlikes a clip and returns its new total, or null if that could not be saved. */
export async function saveLike(id: string, liked: boolean): Promise<number | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const existing = await client.auth.getSession();
    if (!existing.data.session) {
      const { error } = await client.auth.signInAnonymously();
      if (error) return null;
    }

    const { data, error } = await client.rpc('set_video_like', { v: id, liked });
    if (error || typeof data !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** What each clip should end up as, by id. Held here; storage is only its backup. */
let pending: Record<string, boolean> | null = null;

function pendingLikes(): Record<string, boolean> {
  if (pending) return pending;
  pending = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      pending = parsed as Record<string, boolean>;
    }
  } catch {
    // Nothing kept, or nowhere to keep it; this visit still works from memory.
  }
  return pending;
}

function storePendingLikes(): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingLikes()));
  } catch {
    // Not remembered past this visit.
  }
}

/** The server's list with anything it hasn't received yet laid over it. */
export function withPendingLikes(server: string[]): string[] {
  const current = pendingLikes();
  const liked = server.filter((id) => current[id] !== false);
  for (const [id, wanted] of Object.entries(current)) {
    if (wanted && !liked.includes(id)) liked.push(id);
  }
  return liked;
}

/** Clips with a save on its way, so a second tap waits its turn. */
const sending = new Set<string>();

/**
 * Sends one clip's wanted state, one request at a time, so saves reach the
 * server in order. A tap made meanwhile goes out next, and only the final total
 * is reported. If a save fails the clip stays pending for the next attempt.
 */
async function sendLike(id: string, onTotal: (id: string, total: number) => void): Promise<void> {
  if (sending.has(id)) return;
  sending.add(id);
  try {
    for (;;) {
      const wanted = pendingLikes()[id];
      if (wanted === undefined) return;

      const total = await saveLike(id, wanted);
      if (total === null) return;

      if (pendingLikes()[id] === wanted) {
        delete pendingLikes()[id];
        storePendingLikes();
        onTotal(id, total);
        return;
      }
    }
  } finally {
    sending.delete(id);
  }
}

/** Records a tap and sends it. */
export function queueLike(
  id: string,
  liked: boolean,
  onTotal: (id: string, total: number) => void,
): Promise<void> {
  pendingLikes()[id] = liked;
  storePendingLikes();
  return sendLike(id, onTotal);
}

/** Retries everything that hasn't reached the server yet. */
export async function flushPendingLikes(
  onTotal: (id: string, total: number) => void,
): Promise<void> {
  await Promise.all(Object.keys(pendingLikes()).map((id) => sendLike(id, onTotal)));
}

/** 950 → "950", 1200 → "1.2K", 15000 → "15K", 2500000 → "2.5M". */
export function formatLikeCount(count: number): string {
  if (count < 1000) return String(count);
  const [value, suffix] = count < 1_000_000 ? [count / 1000, 'K'] : [count / 1_000_000, 'M'];
  const rounded = value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value);
  return `${rounded}${suffix}`;
}
