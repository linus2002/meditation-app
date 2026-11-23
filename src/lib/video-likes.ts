import { isThisReader, personalAccountId, personalKey } from '@/lib/account-scope';
import { getSupabase } from '@/lib/supabase/client';

/*
 * Shared like counts for the home videos (supabase/migrations/…_video_likes.sql).
 *
 * Reading counts needs no account. Liking needs one, so the first like signs
 * the person in anonymously; nobody who only watches
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
  const user = session.session?.user;
  if (!session.session || !isThisReader(user)) return null;

  const { data, error } = await client.from('video_likes').select('video_id');
  if (error || !data) return null;
  if ((await client.auth.getSession()).data.session?.user?.id !== user?.id) return null;
  return (data as { video_id: string }[]).map((row) => row.video_id);
}

/**
 * One anonymous account for the visit, however many first likes race to make
 * it: two separate ones split the likes and left one set orphaned.
 */
let anonymousSignIn: Promise<boolean> | null = null;

function ensureAnonymous(client: NonNullable<ReturnType<typeof getSupabase>>): Promise<boolean> {
  anonymousSignIn ??= client.auth
    .signInAnonymously()
    .then(({ error }) => !error)
    .catch(() => false)
    .then((ok) => {
      if (!ok) anonymousSignIn = null; // try again on the next like
      return ok;
    });
  return anonymousSignIn;
}

/** Likes or unlikes a clip and returns its new total, or null if that could not be saved. */
export async function saveLike(id: string, liked: boolean): Promise<number | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const existing = await client.auth.getSession();
    // Also stops an offline member being swapped for a new anonymous account.
    if (!isThisReader(existing.data.session?.user)) return null;
    if (!existing.data.session && !(await ensureAnonymous(client))) return null;

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
    const parsed: unknown = JSON.parse(localStorage.getItem(personalKey(PENDING_KEY)) ?? '{}');
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
    localStorage.setItem(personalKey(PENDING_KEY), JSON.stringify(pendingLikes()));
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

// ---- A guest's likes follow them into the account they sign in to -----------

/*
 * Liking as a guest makes an anonymous account; signing in replaces it on this
 * phone. Its likes would then be lost to the reader and counted again when
 * they liked the same clips as themselves. So the guest's access token is set
 * aside in this tab at sign-in, and used once afterwards to take the likes off
 * the anonymous account and put them on the member's.
 */
const CLAIM_KEY = 'serenity.likes.claim.v1';

interface Claim {
  token: string;
  /** When the token stops working, epoch ms. */
  until: number;
}

/** Called just before signing in: notes the guest's likes, if any, to move. */
export async function rememberGuestLikes(): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { data } = await client.auth.getSession();
  const session = data.session as { access_token: string; expires_at?: number; user?: { is_anonymous?: boolean } } | null;
  try {
    if (session?.user?.is_anonymous) {
      const until = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600_000;
      window.sessionStorage.setItem(CLAIM_KEY, JSON.stringify({ token: session.access_token, until } satisfies Claim));
    } else {
      window.sessionStorage.removeItem(CLAIM_KEY);
    }
  } catch {
    // Without storage the likes stay with the guest.
  }
}

function readClaim(): Claim | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CLAIM_KEY) ?? 'null') as Claim | null;
    return parsed && typeof parsed.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function dropClaim(): void {
  try {
    window.sessionStorage.removeItem(CLAIM_KEY);
  } catch {
    // Nothing to drop.
  }
}

/** A request to Supabase as the guest, not as whoever is signed in now. */
function asGuest(path: string, token: string, body?: unknown): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return fetch(`${url}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: key ?? '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** After signing in: moves the guest's likes to this account, once. */
export async function claimGuestLikes(onTotal: (id: string, total: number) => void): Promise<void> {
  const claim = readClaim();
  if (!claim || !personalAccountId()) return;
  if (Date.now() > claim.until) return dropClaim();

  try {
    const res = await asGuest('video_likes?select=video_id', claim.token);
    if (res.status === 401 || res.status === 403) return dropClaim();
    if (!res.ok) return; // offline or a hiccup: the next launch in this tab tries again
    const ids = ((await res.json()) as { video_id: string }[]).map((row) => row.video_id);
    for (const id of ids) {
      // Off the guest first, so the clip is never counted twice.
      const off = await asGuest('rpc/set_video_like', claim.token, { v: id, liked: false });
      if (!off.ok) return;
      await queueLike(id, true, onTotal);
    }
    dropClaim();
  } catch {
    // Tried again next time.
  }
}

/** 950 → "950", 1200 → "1.2K", 15000 → "15K", 2500000 → "2.5M". */
export function formatLikeCount(count: number): string {
  if (count < 1000) return String(count);
  const [value, suffix] = count < 1_000_000 ? [count / 1000, 'K'] : [count / 1_000_000, 'M'];
  const rounded = value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value);
  return `${rounded}${suffix}`;
}
