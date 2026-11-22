import { isThisReader, personalAccountId, personalKey } from '@/lib/account-scope';
import { getSupabase } from '@/lib/supabase/client';

/*
 * Cloud sync for the reader's own meditation ratings
 * (supabase/migrations/…_meditation_ratings.sql).
 *
 * A rating is kept on the phone first. A signed-in reader's change is also
 * noted as pending until the account has it, so one given or cleared offline
 * is sent later and is never undone by the account's older list. With nothing
 * pending, the account's list is the truth, so a clear on another phone
 * arrives here too.
 */

const PENDING_KEY = 'serenity.ratings.pending.v1';
/** Set once ratings from before there was a pending list have been sent up. */
const BACKFILLED_KEY = 'serenity.ratings.backfilled.v1';
/** How often to start again when a rating changes while the list is loading. */
const LOAD_ATTEMPTS = 4;

/** The score wanted for each meditation; null means cleared. */
type Pending = Record<string, number | null>;

/** Used only where storage can't be. */
let memory: Pending = {};
/** Counts changes to the pending list, to spot one made during a request. */
let revision = 0;
/** One send at a time, so the last tap is the last write. */
let sending: Promise<void> = Promise.resolve();

function readPending(): Pending {
  try {
    const raw = window.localStorage.getItem(personalKey(PENDING_KEY));
    return raw ? (JSON.parse(raw) as Pending) : { ...memory };
  } catch {
    return { ...memory };
  }
}

function writePending(next: Pending): void {
  memory = next;
  revision += 1;
  try {
    window.localStorage.setItem(personalKey(PENDING_KEY), JSON.stringify(next));
  } catch {
    // Remembered for this visit only.
  }
}

async function readerId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  return user && isThisReader(user) ? user.id : null;
}

/**
 * Makes the account hold exactly `score`, and says whether it does.
 *
 * The deployed `set_meditation_rating` toggles: sent the score it already has,
 * it deletes it. So a score is cleared and then set, which lands the same
 * whatever was there. The answer is checked, because another tab doing the
 * same at the same moment can still toggle it off; that stays pending.
 */
async function writeRating(id: string, score: number | null): Promise<boolean> {
  try {
    const client = getSupabase();
    const reader = await readerId();
    if (!client || !reader) return false;

    const cleared = await client.rpc('set_meditation_rating', { mid: id, score: null as unknown as number });
    if (cleared.error) return false;
    if (score === null) return true;

    // The session can change between the two calls.
    if ((await readerId()) !== reader) return false;
    const { data, error } = await client.rpc('set_meditation_rating', { mid: id, score });
    return !error && data === score;
  } catch {
    return false;
  }
}

async function drain(): Promise<void> {
  for (const [id, score] of Object.entries(readPending())) {
    if (!(await writeRating(id, score))) continue;
    const latest = readPending();
    // Changed meanwhile: the newer wish is still to send.
    if (latest[id] !== score) continue;
    delete latest[id];
    writePending(latest);
  }
}

function flushRatings(): Promise<void> {
  sending = sending.then(drain).catch(() => undefined);
  return sending;
}

/** Notes a rating, or a clear, and sends it when it can. */
export function queueRating(id: string, score: number | null): Promise<void> {
  if (!personalAccountId()) return Promise.resolve();
  writePending({ ...readPending(), [id]: score });
  return flushRatings();
}

async function fetchRatings(): Promise<Record<string, number> | null> {
  try {
    const client = getSupabase();
    const reader = await readerId();
    if (!client || !reader) return null;

    const { data, error } = await client.rpc('my_meditation_ratings');
    // The session can change during the request; then this answer is someone else's.
    if (error || !Array.isArray(data) || (await readerId()) !== reader) return null;

    const ratings: Record<string, number> = {};
    for (const row of data as { meditation_id: string; score: number }[]) ratings[row.meditation_id] = row.score;
    return ratings;
  } catch {
    return null;
  }
}

function hasBackfilled(): boolean {
  try {
    return window.localStorage.getItem(personalKey(BACKFILLED_KEY)) === '1';
  } catch {
    // With nowhere to remember it, resending each launch would undo clears.
    return true;
  }
}

function markBackfilled(): void {
  try {
    window.localStorage.setItem(personalKey(BACKFILLED_KEY), '1');
  } catch {
    // See hasBackfilled.
  }
}

/**
 * Sends what is waiting, then returns the ratings the phone should show, or
 * null to leave them as they are (signed out, offline, or a server error).
 */
export async function loadRatings(local: () => Record<string, number>): Promise<Record<string, number> | null> {
  if (!personalAccountId()) return null;

  for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt += 1) {
    await flushRatings();
    const before = revision;
    const account = await fetchRatings();
    if (!account) return null;
    if (revision !== before) continue;

    const pending = readPending();
    if (!hasBackfilled()) {
      markBackfilled();
      // Older builds never retried, so the phone may hold ratings the account never got.
      const missing = Object.entries(local()).filter(([id]) => !(id in account) && !(id in pending));
      if (missing.length > 0) {
        writePending({ ...pending, ...Object.fromEntries(missing) });
        continue;
      }
    }

    const shown = { ...account };
    for (const [id, score] of Object.entries(pending)) {
      if (score === null) delete shown[id];
      else shown[id] = score;
    }
    return shown;
  }
  return null;
}
