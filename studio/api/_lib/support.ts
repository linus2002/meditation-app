import { neon } from '@neondatabase/serverless';

/**
 * Help & support: people raise a concern in the app, and the team answers it
 * from the Studio's Support tab. The conversations live in a Neon Postgres
 * database, never in Sanity (which is public content) or in the app.
 *
 * Only server code reaches the database, through two Vercel functions:
 *
 *   - api/support.ts        the app. Each request carries the person's Supabase
 *                           sign-in, which is checked with Supabase; they only
 *                           ever see and write their own conversations.
 *   - api/support-admin.ts  the Studio's Support tab. Only members of the Sanity
 *                           project get an answer, as with the Analytics tab.
 *
 * Under `sanity dev`, supportProxy.ts serves the Support tab from this computer.
 *
 * Environment (Vercel project settings, or studio/.env.local for `sanity dev`):
 *   DATABASE_URL               Neon's connection string. Connecting Neon from
 *                              the Vercel project's Storage tab sets it.
 *                              POSTGRES_URL is accepted too.
 *   SUPABASE_URL               the app's Supabase project address
 *   SUPABASE_SERVICE_ROLE_KEY  used only to ask Supabase who a sign-in belongs
 *                              to; already set for the Analytics tab.
 *
 * The tables are created on first use, so there is no migration to run.
 */

export const SUPPORT_ENV_NAMES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export type SupportEnv = Partial<Record<(typeof SUPPORT_ENV_NAMES)[number], string>>;

export interface Reply {
  status: number;
  body: unknown;
}

export interface SupportUser {
  id: string;
  email: string | null;
}

export const STATUSES = ['open', 'answered', 'closed'] as const;
type Status = (typeof STATUSES)[number];

export const CATEGORIES = [
  'Something isn’t working',
  'Account & sign-in',
  'Sessions & content',
  'Suggestion',
  'Other',
] as const;

const LIMITS = {
  subject: 120,
  body: 4000,
  /** New conversations one person may open in a day. */
  threadsPerDay: 5,
  /** Messages one person may send in an hour, across their conversations. */
  messagesPerHour: 30,
};

/** How long after the last keystroke someone still shows as typing. */
const TYPING_SECONDS = 6;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The variables above, from any source (process.env, Vite's loadEnv). */
export function pickSupportEnv(...sources: Record<string, string | undefined>[]): SupportEnv {
  const out: SupportEnv = {};
  for (const source of sources) {
    for (const name of SUPPORT_ENV_NAMES) {
      // Pasted values often bring spaces, line breaks or quotes along.
      const value = source[name]?.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
      if (value) out[name] = value;
    }
  }
  return out;
}

/** A message time the client already has, or null to ask for the whole conversation. */
function since(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40 || Number.isNaN(Date.parse(value))) return null;
  return value;
}

const ok = (body: unknown): Reply => ({ status: 200, body });
const fail = (status: number, error: string): Reply => ({ status, body: { error } });

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** A tagged-template query function: Neon's, or a stand-in for tests. */
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, any>[]>;

export function createSupport(env: SupportEnv, overrides: { sql?: Sql } = {}) {
  const url = env.DATABASE_URL || env.POSTGRES_URL;
  const sql: Sql | null = overrides.sql ?? (url ? (neon(url) as unknown as Sql) : null);
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  let ready: Promise<void> | null = null;
  /** Creates the tables once per process. Safe to run against an existing database. */
  function ensureSchema(): Promise<void> {
    if (!sql) return Promise.reject(new Error('not-configured'));
    const create = async () => {
      await sql`create table if not exists support_threads (
        id uuid primary key default gen_random_uuid(),
        user_id text not null,
        user_email text,
        subject text not null,
        category text,
        status text not null default 'open' check (status in ('open', 'answered', 'closed')),
        last_sender text not null default 'user' check (last_sender in ('user', 'admin')),
        platform text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        last_admin_reply_at timestamptz,
        user_seen_at timestamptz,
        admin_seen_at timestamptz
      )`;
      await sql`create table if not exists support_messages (
        id uuid primary key default gen_random_uuid(),
        thread_id uuid not null references support_threads(id) on delete cascade,
        sender text not null check (sender in ('user', 'admin')),
        admin_name text,
        body text not null,
        created_at timestamptz not null default now()
      )`;
      await sql`create index if not exists support_threads_user on support_threads (user_id, updated_at desc)`;
      await sql`create index if not exists support_threads_status on support_threads (status, updated_at desc)`;
      await sql`create index if not exists support_messages_thread on support_messages (thread_id, created_at)`;
      // When each side last pressed a key, for the "typing…" dots.
      await sql`alter table support_threads add column if not exists user_typing_at timestamptz`;
      await sql`alter table support_threads add column if not exists admin_typing_at timestamptz`;
    };
    ready ??= (async () => {
      try {
        await create();
      } catch {
        // Two servers creating the tables at the same moment (the Studio asks
        // for the list and the counts together) collide once; by the second
        // try the tables exist and "if not exists" passes.
        await new Promise((resolve) => setTimeout(resolve, 400));
        await create();
      }
    })().catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  }

  /** Sign-ins already checked, so a screen of requests doesn't ask Supabase each time. */
  const known = new Map<string, { at: number; user: SupportUser }>();

  /**
   * Who a Supabase access token belongs to, or null if it is not a signed-in
   * account with an email (anonymous accounts can't raise concerns).
   */
  async function whoIs(accessToken: string): Promise<SupportUser | null> {
    const hit = known.get(accessToken);
    if (hit && Date.now() - hit.at < 60_000) return hit.user;
    if (!supabaseUrl || !serviceKey) throw new Error('not-configured');
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Supabase answered ${res.status}`);
    const data = (await res.json()) as { id?: string; email?: string; is_anonymous?: boolean };
    if (!data.id || data.is_anonymous || !data.email) return null;
    const user = { id: data.id, email: data.email };
    known.set(accessToken, { at: Date.now(), user });
    return user;
  }

  /** What the app may do, always limited to the person's own conversations. */
  async function forUser(user: SupportUser, payload: Record<string, unknown>): Promise<Reply> {
    await ensureSchema();
    const db = sql!;
    const action = payload.action;

    if (action === 'list') {
      const threads = await db`
        select t.id, t.subject, t.category, t.status, t.created_at, t.updated_at,
          (t.last_admin_reply_at is not null
            and t.last_admin_reply_at > coalesce(t.user_seen_at, 'epoch'::timestamptz)) as unread,
          m.body as last_body, m.sender as last_sender
        from support_threads t
        left join lateral (
          select body, sender from support_messages
          where thread_id = t.id order by created_at desc limit 1
        ) m on true
        where t.user_id = ${user.id}
        order by t.updated_at desc
        limit 100`;
      return ok({ threads, unread: threads.filter((t) => t.unread).length });
    }

    if (action === 'get') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      if (!id) return fail(400, 'Unknown conversation.');
      const [thread] = await db`
        update support_threads set user_seen_at = now()
        where id = ${id} and user_id = ${user.id}
        returning id, subject, category, status, created_at, updated_at`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const messages = await db`
        select id, sender, admin_name, body, created_at from support_messages
        where thread_id = ${id} order by created_at`;
      return ok({ thread, messages });
    }

    if (action === 'sync') {
      // Asked every couple of seconds while a conversation is open: what's new
      // since `after`, whether the team is typing, and this person's own typing.
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      if (!id) return fail(400, 'Unknown conversation.');
      const typing = payload.typing === true;
      const [thread] = await db`
        update support_threads set user_seen_at = now(),
          user_typing_at = case when ${typing}::boolean then now() else null end
        where id = ${id} and user_id = ${user.id}
        returning status,
          coalesce(admin_typing_at > now() - make_interval(secs => ${TYPING_SECONDS}), false) as other_typing`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const after = since(payload.after);
      // ">=": times come back to the millisecond, so the latest message may
      // repeat; the app ignores ids it already has.
      const messages = after
        ? await db`
            select id, sender, admin_name, body, created_at from support_messages
            where thread_id = ${id} and created_at >= ${after}::timestamptz order by created_at`
        : await db`
            select id, sender, admin_name, body, created_at from support_messages
            where thread_id = ${id} order by created_at`;
      return ok({ status: thread.status, typing: thread.other_typing, messages });
    }

    if (action === 'create') {
      const subject = text(payload.subject, LIMITS.subject);
      const body = text(payload.body, LIMITS.body);
      if (!subject || !body) return fail(400, 'Add a subject and a message.');
      const category = CATEGORIES.find((c) => c === payload.category) ?? 'Other';
      const platform = text(payload.platform, 40);
      const [{ count }] = await db`
        select count(*)::int as count from support_threads
        where user_id = ${user.id} and created_at > now() - interval '1 day'`;
      if (count >= LIMITS.threadsPerDay) {
        return fail(429, 'You’ve opened several concerns today. Add to an existing one, or try again tomorrow.');
      }
      const [created] = await db`
        with t as (
          insert into support_threads (user_id, user_email, subject, category, platform, user_seen_at)
          values (${user.id}, ${user.email}, ${subject}, ${category}, ${platform}, now())
          returning id
        )
        insert into support_messages (thread_id, sender, body)
        select id, 'user', ${body} from t
        returning thread_id as id`;
      return ok({ id: created.id });
    }

    if (action === 'reply') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      const body = text(payload.body, LIMITS.body);
      if (!id || !body) return fail(400, 'Write a message first.');
      const [{ count }] = await db`
        select count(*)::int as count from support_messages m
        join support_threads t on t.id = m.thread_id
        where t.user_id = ${user.id} and m.sender = 'user' and m.created_at > now() - interval '1 hour'`;
      if (count >= LIMITS.messagesPerHour) return fail(429, 'That’s a lot of messages at once. Please wait a little.');
      // Replying reopens a conversation that was answered or closed.
      const [thread] = await db`
        update support_threads
        set status = 'open', last_sender = 'user', updated_at = now(), user_seen_at = now(),
          user_typing_at = null
        where id = ${id} and user_id = ${user.id}
        returning id`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const [message] = await db`
        insert into support_messages (thread_id, sender, body) values (${id}, 'user', ${body})
        returning id, sender, admin_name, body, created_at`;
      return ok({ id, message });
    }

    if (action === 'close') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      if (!id) return fail(400, 'Unknown conversation.');
      const [thread] = await db`
        update support_threads set status = 'closed', updated_at = now()
        where id = ${id} and user_id = ${user.id} returning id`;
      return thread ? ok({ id }) : fail(404, 'Unknown conversation.');
    }

    return fail(400, 'Unknown request.');
  }

  /** What the Studio's Support tab may do: every conversation. */
  async function forAdmin(payload: Record<string, unknown>): Promise<Reply> {
    await ensureSchema();
    const db = sql!;
    const action = payload.action;

    if (action === 'counts') {
      const [counts] = await db`
        select
          count(*) filter (where status <> 'closed' and last_sender = 'user')::int as awaiting,
          count(*) filter (where status = 'open')::int as open,
          count(*) filter (where status = 'answered')::int as answered,
          count(*) filter (where status = 'closed')::int as closed,
          count(*)::int as all
        from support_threads`;
      return ok(counts);
    }

    if (action === 'list') {
      const filter = typeof payload.filter === 'string' ? payload.filter : 'awaiting';
      const search = typeof payload.search === 'string' ? payload.search.trim().slice(0, 100) : '';
      const like = `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      const threads = await db`
        select t.id, t.user_email, t.subject, t.category, t.status, t.platform, t.last_sender,
          t.created_at, t.updated_at,
          (t.last_sender = 'user' and t.updated_at > coalesce(t.admin_seen_at, 'epoch'::timestamptz)) as unread,
          m.body as last_body,
          (select count(*)::int from support_messages where thread_id = t.id) as message_count
        from support_threads t
        left join lateral (
          select body from support_messages where thread_id = t.id order by created_at desc limit 1
        ) m on true
        where (
          ${filter} = 'all'
          or (${filter} = 'awaiting' and t.status <> 'closed' and t.last_sender = 'user')
          or t.status = ${filter}
        )
        and (${search} = '' or t.subject ilike ${like} or t.user_email ilike ${like})
        order by t.updated_at desc
        limit 200`;
      return ok({ threads });
    }

    if (action === 'get') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      if (!id) return fail(400, 'Unknown conversation.');
      const [thread] = await db`
        update support_threads set admin_seen_at = now() where id = ${id}
        returning id, user_id, user_email, subject, category, status, platform, created_at, updated_at`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const messages = await db`
        select id, sender, admin_name, body, created_at from support_messages
        where thread_id = ${id} order by created_at`;
      return ok({ thread, messages });
    }

    if (action === 'sync') {
      // The open conversation in the Support tab, every couple of seconds.
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      if (!id) return fail(400, 'Unknown conversation.');
      const typing = payload.typing === true;
      const [thread] = await db`
        update support_threads set admin_seen_at = now(),
          admin_typing_at = case when ${typing}::boolean then now() else null end
        where id = ${id}
        returning status,
          coalesce(user_typing_at > now() - make_interval(secs => ${TYPING_SECONDS}), false) as other_typing`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const after = since(payload.after);
      const messages = after
        ? await db`
            select id, sender, admin_name, body, created_at from support_messages
            where thread_id = ${id} and created_at >= ${after}::timestamptz order by created_at`
        : await db`
            select id, sender, admin_name, body, created_at from support_messages
            where thread_id = ${id} order by created_at`;
      return ok({ status: thread.status, typing: thread.other_typing, messages });
    }

    if (action === 'reply') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      const body = text(payload.body, LIMITS.body);
      const adminName = text(payload.adminName, 80);
      if (!id || !body) return fail(400, 'Write a reply first.');
      // If the person wrote something the team has not seen yet (it crossed
      // with this reply), the conversation still waits for an answer to that.
      // SET reads the row as it was, so admin_seen_at here is the old value.
      const [thread] = await db`
        update support_threads t
        set status = case when exists (
              select 1 from support_messages m
              where m.thread_id = t.id and m.sender = 'user'
                and m.created_at > coalesce(t.admin_seen_at, 'epoch'::timestamptz)
            ) then 'open' else 'answered' end,
          last_sender = case when exists (
              select 1 from support_messages m
              where m.thread_id = t.id and m.sender = 'user'
                and m.created_at > coalesce(t.admin_seen_at, 'epoch'::timestamptz)
            ) then 'user' else 'admin' end,
          updated_at = now(), last_admin_reply_at = now(), admin_seen_at = now(), admin_typing_at = null
        where id = ${id} returning id, status`;
      if (!thread) return fail(404, 'Unknown conversation.');
      const [message] = await db`
        insert into support_messages (thread_id, sender, admin_name, body)
        values (${id}, 'admin', ${adminName}, ${body})
        returning id, sender, admin_name, body, created_at`;
      return ok({ id, message, status: thread.status });
    }

    if (action === 'status') {
      const id = typeof payload.id === 'string' && UUID.test(payload.id) ? payload.id : null;
      const status = STATUSES.find((s) => s === payload.status) as Status | undefined;
      if (!id || !status) return fail(400, 'Unknown status.');
      const [thread] = await db`
        update support_threads set status = ${status}, updated_at = now() where id = ${id} returning id`;
      return thread ? ok({ id, status }) : fail(404, 'Unknown conversation.');
    }

    return fail(400, 'Unknown request.');
  }

  /**
   * Runs a handler, turning setup and database problems into readable answers.
   * `detailed` adds the database's own error text, for editors in the Studio only.
   */
  async function safely(run: () => Promise<Reply>, detailed = false): Promise<Reply> {
    if (!sql) {
      return fail(503, 'Support isn’t set up yet: DATABASE_URL is missing from this deployment.');
    }
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'not-configured') {
        return fail(503, 'Support isn’t set up yet: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
      }
      console.error('[support]', message);
      return fail(
        502,
        detailed
          ? `The support database answered with an error: ${message.slice(0, 400)}`
          : 'The support database could not be reached. Please try again.',
      );
    }
  }

  /** Every conversation a person ever started, and its messages: for deleting an account. */
  async function eraseUser(userId: string): Promise<void> {
    await ensureSchema();
    await sql!`delete from support_threads where user_id = ${userId}`;
  }

  return { whoIs, forUser, forAdmin, safely, eraseUser, configured: Boolean(sql) };
}
