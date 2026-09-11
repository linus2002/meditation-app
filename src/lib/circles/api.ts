import { getMeditation } from '@/data/meditations';
import type { CheckinRow, ResponseRow, RosterEntry } from '@/lib/circles/feed';
import type { Circle, CircleGoal, CircleLevel, CircleStatus, MemberRole, TimeBand } from '@/lib/circles/types';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Everything Circles asks of Supabase, in one place. Nothing else imports the
 * client for Circles, so the rest of the feature stays plain, testable logic.
 *
 * Failures come back as a `CirclesError` with a short code the screens turn
 * into words — "This circle has just filled up" rather than a database error.
 */

export type CirclesErrorCode =
  | 'unavailable'
  | 'offline'
  | 'not_signed_in'
  | 'circle_full'
  | 'circle_not_open'
  | 'already_member'
  | 'too_many_circles'
  | 'not_a_member'
  | 'checkin_out_of_range'
  | 'checkin_before_joining'
  | 'no_prompt_today'
  | 'invalid'
  | 'unknown';

const KNOWN: CirclesErrorCode[] = [
  'not_signed_in',
  'circle_full',
  'circle_not_open',
  'already_member',
  'too_many_circles',
  'not_a_member',
  'checkin_out_of_range',
  'checkin_before_joining',
  'no_prompt_today',
];

export class CirclesError extends Error {
  constructor(
    public readonly code: CirclesErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'CirclesError';
  }
}

function toError(error: { message?: string; code?: string } | null | undefined): CirclesError {
  const message = error?.message ?? '';
  const known = KNOWN.find((code) => message.includes(code));
  if (known) return new CirclesError(known, message);
  if (error?.code === '23514') return new CirclesError('invalid', message);
  if (/fetch|network|Failed to fetch/i.test(message)) return new CirclesError('offline', message);
  return new CirclesError('unknown', message);
}

function supabase() {
  const client = getSupabase();
  if (!client) throw new CirclesError('unavailable');
  return client;
}

/* ------------------------------------------------------------------ *
 * Rows as the database returns them
 * ------------------------------------------------------------------ */

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  goal: CircleGoal;
  time_band: TimeBand;
  level: CircleLevel;
  tz: string;
  session_time: string;
  session_days: number[];
  meditation_id: string;
  capacity: number;
  member_count: number;
  status: CircleStatus;
}

/**
 * A circle whose session is not in this build's catalogue cannot be run, so it
 * is left out rather than shown with a guessed length.
 */
function toCircle(row: CircleRow): Circle | null {
  const meditation = getMeditation(row.meditation_id);
  if (!meditation) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    goal: row.goal,
    timeBand: row.time_band,
    level: row.level,
    tz: row.tz,
    // Postgres `time` comes back as HH:MM:SS.
    sessionTime: row.session_time.slice(0, 5),
    sessionDays: row.session_days,
    meditationId: row.meditation_id,
    durationSeconds: meditation.durationSeconds,
    capacity: row.capacity,
    memberCount: row.member_count,
    status: row.status,
  };
}

function circles(rows: CircleRow[] | null): Circle[] {
  return (rows ?? []).map(toCircle).filter((entry): entry is Circle => entry !== null);
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

/** The signed-in user's id, or null. Never signs anyone in. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Makes sure there is an account, creating an anonymous one if needed.
 *
 * Called when someone finishes intake and chooses a circle — never on launch,
 * so nobody who never opens Circles gets an account.
 */
export async function ensureSession(): Promise<string> {
  const client = supabase();
  const existing = await client.auth.getSession();
  if (existing.data.session) return existing.data.session.user.id;

  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw toError(error);
  return data.user.id;
}

/* ------------------------------------------------------------------ *
 * Circles and membership
 * ------------------------------------------------------------------ */

export async function listOpenCircles(): Promise<Circle[]> {
  const { data, error } = await supabase()
    .from('circles')
    .select('*')
    .eq('status', 'open')
    .order('slug');
  if (error) throw toError(error);
  return circles(data as CircleRow[]);
}

export interface Membership {
  circle: Circle;
  role: MemberRole;
  /** Epoch ms. */
  joinedAt: number;
}

export async function getMyMemberships(): Promise<Membership[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const { data, error } = await supabase()
    .from('circle_members')
    .select('role, joined_at, circles(*)')
    .eq('user_id', userId)
    .order('joined_at');
  if (error) throw toError(error);

  const rows = (data ?? []) as unknown as {
    role: MemberRole;
    joined_at: string;
    circles: CircleRow | null;
  }[];

  return rows.flatMap((row) => {
    const circle = row.circles ? toCircle(row.circles) : null;
    return circle ? [{ circle, role: row.role, joinedAt: Date.parse(row.joined_at) }] : [];
  });
}

export async function getCircle(id: string): Promise<Circle | null> {
  const { data, error } = await supabase().from('circles').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error);
  return data ? toCircle(data as CircleRow) : null;
}

export async function joinCircle(id: string): Promise<void> {
  const { error } = await supabase().rpc('join_circle', { c: id });
  if (error) throw toError(error);
}

export async function leaveCircle(id: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new CirclesError('not_signed_in');

  const { error } = await supabase()
    .from('circle_members')
    .delete()
    .eq('circle_id', id)
    .eq('user_id', userId);
  if (error) throw toError(error);
}

/* ------------------------------------------------------------------ *
 * Inside a circle
 * ------------------------------------------------------------------ */

export async function getRoster(id: string): Promise<RosterEntry[]> {
  const { data, error } = await supabase().rpc('circle_roster', { c: id });
  if (error) throw toError(error);
  return ((data ?? []) as { user_id: string; display_name: string | null; role: MemberRole; joined_at: string }[]).map(
    (row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      role: row.role,
      joinedAt: row.joined_at,
    }),
  );
}

/** Sits in this circle from `sinceDate` (circle-local `YYYY-MM-DD`) onwards. */
export async function getCheckins(id: string, sinceDate: string): Promise<CheckinRow[]> {
  const { data, error } = await supabase()
    .from('circle_checkins')
    .select('user_id, local_date, live, created_at')
    .eq('circle_id', id)
    .gte('local_date', sinceDate);
  if (error) throw toError(error);
  return ((data ?? []) as { user_id: string; local_date: string; live: boolean; created_at: string }[]).map(
    (row) => ({
      userId: row.user_id,
      localDate: row.local_date,
      live: row.live,
      createdAt: row.created_at,
    }),
  );
}

/** Days that counted for the group streak, from `sinceDate` onwards. */
export async function getCircleDays(id: string, sinceDate: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('circle_days')
    .select('local_date')
    .eq('circle_id', id)
    .gte('local_date', sinceDate);
  if (error) throw toError(error);
  return ((data ?? []) as { local_date: string }[]).map((row) => row.local_date);
}

export async function getResponses(id: string, sinceDate: string): Promise<ResponseRow[]> {
  const { data, error } = await supabase()
    .from('prompt_responses')
    .select('user_id, local_date, prompt_id, body, updated_at, hidden')
    .eq('circle_id', id)
    .gte('local_date', sinceDate);
  if (error) throw toError(error);
  return (
    (data ?? []) as {
      user_id: string;
      local_date: string;
      prompt_id: string;
      body: string;
      updated_at: string;
      hidden: boolean;
    }[]
  ).map((row) => ({
    userId: row.user_id,
    localDate: row.local_date,
    promptId: row.prompt_id,
    body: row.body,
    updatedAt: row.updated_at,
    hidden: row.hidden,
  }));
}

export interface CircleToday {
  /** Circle-local date, `YYYY-MM-DD`. */
  today: string;
  promptId: string | null;
  question: string | null;
}

export async function getCircleToday(id: string): Promise<CircleToday> {
  const { data, error } = await supabase().rpc('circle_today', { c: id });
  if (error) throw toError(error);
  const row = ((data ?? []) as { today: string; prompt_id: string; question: string }[])[0];
  return {
    today: row?.today ?? '',
    promptId: row?.prompt_id ?? null,
    question: row?.question ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

export async function recordCheckin(id: string, satAt: number, live: boolean): Promise<void> {
  const { error } = await supabase().rpc('record_checkin', {
    c: id,
    sat_at: new Date(satAt).toISOString(),
    live,
  });
  if (error) throw toError(error);
}

export async function answerPrompt(id: string, answer: string): Promise<void> {
  const { error } = await supabase().rpc('answer_prompt', { c: id, answer });
  if (error) throw toError(error);
}

export async function deleteAnswer(id: string, localDate: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new CirclesError('not_signed_in');

  const { error } = await supabase()
    .from('prompt_responses')
    .delete()
    .eq('circle_id', id)
    .eq('local_date', localDate)
    .eq('user_id', userId);
  if (error) throw toError(error);
}

export type ReportReason = 'unkind' | 'spam' | 'unsafe' | 'other';

export async function reportAnswer(
  id: string,
  localDate: string,
  authorId: string,
  reason: ReportReason,
): Promise<void> {
  const { error } = await supabase().from('response_reports').insert({
    circle_id: id,
    local_date: localDate,
    author_id: authorId,
    reason,
  });
  // Reporting the same answer twice is already done, not an error.
  if (error && error.code !== '23505') throw toError(error);
}

/* ------------------------------------------------------------------ *
 * The reader's own account
 * ------------------------------------------------------------------ */

export async function getDisplayName(): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await supabase()
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw toError(error);
  return (data as { display_name: string | null } | null)?.display_name ?? null;
}

export async function setDisplayName(name: string | null): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new CirclesError('not_signed_in');

  const { error } = await supabase()
    .from('profiles')
    .update({ display_name: name?.trim() || null })
    .eq('id', userId);
  if (error) throw toError(error);
}

/**
 * How far this device's clock is from the server's, in milliseconds, taken at
 * the midpoint of the round trip. Added to `Date.now()` by the live session so
 * a phone a minute fast still sits in step with everyone else.
 */
export async function measureClockSkew(): Promise<number> {
  const sentAt = Date.now();
  const { data, error } = await supabase().rpc('server_now');
  const receivedAt = Date.now();
  if (error || typeof data !== 'string') return 0;

  const serverAt = Date.parse(data);
  if (!Number.isFinite(serverAt)) return 0;
  return serverAt - (sentAt + receivedAt) / 2;
}

/** Step one of keeping an anonymous account: send a code to the email. */
export async function startEmailLink(email: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ email });
  if (error) throw toError(error);
}

/** Step two: the code from the email makes the account permanent. */
export async function confirmEmailLink(email: string, code: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ email, token: code, type: 'email_change' });
  if (error) throw toError(error);
}

/** The email attached to the account, once one has been confirmed. */
export async function getAccountEmail(): Promise<string | null> {
  const { data } = await supabase().auth.getUser();
  return data.user?.email ?? null;
}

/** Removes the account and everything Circles holds for it. */
export async function deleteMyAccount(): Promise<void> {
  const client = supabase();
  const { error } = await client.rpc('delete_my_account');
  if (error) throw toError(error);
  await client.auth.signOut();
}
