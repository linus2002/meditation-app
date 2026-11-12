import { getSupabase } from '@/lib/supabase/client';
import { isDeviceOnly, onResumeChange, type ResumeEntry, type ResumeMap } from '@/lib/resume';
import type { SessionRecord } from '@/types';

/*
 * Keeps a signed-in reader's practice in their account
 * (supabase/migrations/…_practice_sync.sql): every sitting, and the place each
 * session was left. The phone is always written first, so the app works the
 * same offline; this follows behind, and a full sync on sign-in and on each
 * launch sends up anything that missed the network and brings down what
 * another phone added.
 *
 * Every call fails quietly. Without keys, offline, signed out, or on any
 * server error, the phone's copy simply stays the only one for now.
 */

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const KEY_PATTERN = /^[a-z0-9][a-z0-9:-]{0,119}$/;

/** The signed-in account's id, or null for a guest or an anonymous account. */
export async function memberId(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous && user.email ? user.id : null;
}

// ---- Sittings -------------------------------------------------------------

interface SessionRow {
  user_id: string;
  id: string;
  meditation_id: string;
  day: string;
  seconds: number;
  completed: boolean;
  started_at: string;
}

function toRow(userId: string, record: SessionRecord): SessionRow | null {
  if (!ID_PATTERN.test(record.meditationId)) return null;
  return {
    user_id: userId,
    id: record.id,
    meditation_id: record.meditationId,
    day: record.date,
    seconds: Math.max(0, Math.min(86400, Math.round(record.seconds))),
    completed: record.completed,
    started_at: new Date(record.startedAt).toISOString(),
  };
}

function fromRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    meditationId: row.meditation_id,
    date: row.day,
    seconds: row.seconds,
    completed: row.completed,
    startedAt: new Date(row.started_at).getTime(),
  };
}

async function upsertSessions(userId: string, records: SessionRecord[]): Promise<void> {
  const client = getSupabase();
  if (!client || records.length === 0) return;
  const rows = records.map((record) => toRow(userId, record)).filter((row) => row !== null);
  for (let i = 0; i < rows.length; i += 500) {
    await client
      .from('practice_sessions')
      .upsert(
        rows.slice(i, i + 500).map((row) => ({ ...row, updated_at: new Date().toISOString() })),
        { onConflict: 'user_id,id' },
      );
  }
}

/** Sends one sitting up, as it is recorded. */
export async function pushSession(record: SessionRecord): Promise<void> {
  try {
    const userId = await memberId();
    if (userId) await upsertSessions(userId, [record]);
  } catch {
    // The full sync on next launch sends it again.
  }
}

/**
 * The same sitting can exist on both sides: keep the longer one, and once
 * either side saw it to the end it stays finished.
 */
export function mergeSessionLists(local: SessionRecord[], remote: SessionRecord[]): SessionRecord[] {
  const byId = new Map<string, SessionRecord>();
  for (const record of [...local, ...remote]) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      continue;
    }
    byId.set(record.id, {
      ...(record.seconds > existing.seconds ? record : existing),
      completed: existing.completed || record.completed,
    });
  }
  return [...byId.values()].sort((a, b) => b.startedAt - a.startedAt);
}

/** Sittings on this phone the account lacks, or holds a shorter copy of. */
export function sessionsToSend(local: SessionRecord[], remote: SessionRecord[]): SessionRecord[] {
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  return local.filter((record) => {
    const theirs = remoteById.get(record.id);
    return !theirs || theirs.seconds < record.seconds || (record.completed && !theirs.completed);
  });
}

/**
 * Brings the account and this phone level. Returns the merged list for the
 * phone to keep, or null when there was nothing to sync with.
 *
 * `uploadLocal` is false when the phone's history belongs to someone else (a
 * different account was last signed in here), so it is never filed under
 * this account; their own history still comes down.
 */
export async function syncSessions(
  local: SessionRecord[],
  uploadLocal: boolean,
): Promise<SessionRecord[] | null> {
  try {
    const client = getSupabase();
    const userId = await memberId();
    if (!client || !userId) return null;

    const { data, error } = await client
      .from('practice_sessions')
      .select('user_id,id,meditation_id,day,seconds,completed,started_at')
      .order('started_at', { ascending: false })
      .limit(2000);
    if (error) return null;
    const remote = (data as SessionRow[]).map(fromRow);

    if (uploadLocal) await upsertSessions(userId, sessionsToSend(local, remote));
    return mergeSessionLists(uploadLocal ? local : [], remote).slice(0, 2000);
  } catch {
    return null;
  }
}

// ---- Places left part-way ---------------------------------------------------

interface ResumeRow {
  user_id: string;
  item_key: string;
  position: number;
  saved_at: string;
}

function resumeRow(userId: string, key: string, entry: ResumeEntry): ResumeRow | null {
  if (isDeviceOnly(key) || !KEY_PATTERN.test(key)) return null;
  return {
    user_id: userId,
    item_key: key,
    position: Math.max(0, Math.floor(entry.seconds)),
    saved_at: new Date(entry.savedAt).toISOString(),
  };
}

async function upsertResume(userId: string, entries: ResumeMap): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const rows = Object.entries(entries)
    .map(([key, entry]) => resumeRow(userId, key, entry))
    .filter((row) => row !== null);
  if (rows.length > 0) await client.from('resume_points').upsert(rows, { onConflict: 'user_id,item_key' });
}

/** All places kept in the account. */
export async function fetchResume(): Promise<ResumeMap | null> {
  try {
    const client = getSupabase();
    if (!client || !(await memberId())) return null;
    const { data, error } = await client.from('resume_points').select('item_key,position,saved_at');
    if (error) return null;
    const map: ResumeMap = {};
    for (const row of data as Omit<ResumeRow, 'user_id'>[]) {
      map[row.item_key] = { seconds: row.position, savedAt: new Date(row.saved_at).getTime() };
    }
    return map;
  } catch {
    return null;
  }
}

/** Sends places newer on this phone up to the account. */
export async function pushResume(entries: ResumeMap): Promise<void> {
  try {
    const userId = await memberId();
    if (userId) await upsertResume(userId, entries);
  } catch {
    // Sent again by the next full sync.
  }
}

/*
 * A player saves its place every few seconds while playing. The account only
 * needs the latest, so writes for each session are held back and sent at most
 * every 20 seconds, and straight away when the app goes to the background.
 */
const RESUME_PUSH_INTERVAL_MS = 20_000;
const pending: ResumeMap = {};
const lastSent = new Map<string, number>();
let timer: number | null = null;

function flush() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  const batch = { ...pending };
  for (const key of Object.keys(pending)) {
    delete pending[key];
    lastSent.set(key, Date.now());
  }
  if (Object.keys(batch).length > 0) void pushResume(batch);
}

async function deleteResume(key: string): Promise<void> {
  try {
    const client = getSupabase();
    if (!client || !(await memberId())) return;
    await client.from('resume_points').delete().eq('item_key', key);
  } catch {
    // A stale place in the account loses to the next newer one anyway.
  }
}

let watching = false;

/** Starts sending place changes to the account. Safe to call repeatedly. */
export function watchResumeChanges(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  onResumeChange({
    saved: (key, entry) => {
      pending[key] = entry;
      const since = Date.now() - (lastSent.get(key) ?? 0);
      if (since >= RESUME_PUSH_INTERVAL_MS) flush();
      else if (timer === null) timer = window.setTimeout(flush, RESUME_PUSH_INTERVAL_MS - since);
    },
    cleared: (key) => {
      delete pending[key];
      void deleteResume(key);
    },
  });
  const onHidden = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', onHidden);
}
