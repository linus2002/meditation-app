import { createSupport, type SupportEnv } from './support.js';

/**
 * Deleting an account, for the app's Profile screen. POST /api/account with
 * the person's Supabase sign-in as a Bearer token and
 * { action: 'delete', confirm: 'DELETE' }.
 *
 * In this order, so a failure part-way never leaves the sign-in gone while
 * other data remains reachable only through it:
 *   1. their support conversations (Neon);
 *   2. their analytics profile and events (PostHog), when the key allows it;
 *   3. the Supabase account, which takes their synced sittings, places,
 *      ratings and likes with it (every table references auth.users with
 *      `on delete cascade`).
 *
 * Environment, beyond support's: POSTHOG_PERSONAL_API_KEY with the
 * "person:write" scope, and POSTHOG_PROJECT_ID. The Analytics tab's key is
 * read-only; with it, analytics is reported as left for the team to delete.
 */

export type AccountEnv = SupportEnv &
  Partial<Record<'POSTHOG_PERSONAL_API_KEY' | 'POSTHOG_PROJECT_ID' | 'POSTHOG_APP_HOST', string>>;

export const ACCOUNT_ENV_NAMES = ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID', 'POSTHOG_APP_HOST'] as const;

type Sql = Parameters<typeof createSupport>[1] extends { sql?: infer S } ? S : never;

/** What became of the analytics data. */
type Analytics = 'deleted' | 'none' | 'manual' | 'not-configured';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function createAccountDeletion(env: AccountEnv, overrides: { sql?: Sql; fetch?: typeof fetch } = {}) {
  const support = createSupport(env, { sql: overrides.sql });
  const http = overrides.fetch ?? fetch;
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const posthogKey = env.POSTHOG_PERSONAL_API_KEY;
  const projectId = env.POSTHOG_PROJECT_ID?.match(/project\/(\d+)/)?.[1] ?? env.POSTHOG_PROJECT_ID?.match(/^\d+$/)?.[0];
  const posthogHost = (env.POSTHOG_APP_HOST || 'https://us.posthog.com').replace(/\/$/, '');

  /** Who the token belongs to, checked with Supabase (not cached: this is final). */
  async function whoIs(token: string): Promise<{ id: string } | null> {
    if (!supabaseUrl || !serviceKey) throw new Error('not-configured');
    const res = await http(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Supabase answered ${res.status}`);
    const user = (await res.json()) as { id?: string; is_anonymous?: boolean; email?: string };
    return user.id && !user.is_anonymous && user.email ? { id: user.id } : null;
  }

  async function deleteAnalytics(userId: string): Promise<Analytics> {
    if (!posthogKey || !projectId) return 'not-configured';
    const headers = { Authorization: `Bearer ${posthogKey}` };
    const base = `${posthogHost}/api/projects/${projectId}/persons`;
    const found = await http(`${base}/?distinct_id=${encodeURIComponent(userId)}`, { headers });
    if (!found.ok) return 'manual';
    const person = ((await found.json()) as { results?: { id: string }[] }).results?.[0];
    if (!person) return 'none';
    const removed = await http(`${base}/${person.id}/?delete_events=true`, { method: 'DELETE', headers });
    return removed.ok ? 'deleted' : 'manual';
  }

  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json(405, { error: 'Use POST.' });

    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json(401, { error: 'Sign in to delete your account.' });
    const payload = (await request.json().catch(() => ({}))) as { action?: unknown; confirm?: unknown };
    if (payload.action !== 'delete' || payload.confirm !== 'DELETE') {
      return json(400, { error: 'Type DELETE to confirm.' });
    }

    try {
      const user = await whoIs(token);
      if (!user) return json(401, { error: 'Sign in again to delete your account.' });

      await support.eraseUser(user.id);

      let analytics: Analytics;
      try {
        analytics = await deleteAnalytics(user.id);
      } catch {
        analytics = 'manual';
      }
      if (analytics === 'manual') console.error('[account] analytics left to delete by hand for', user.id);

      const removed = await http(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` },
      });
      if (!removed.ok) throw new Error(`Supabase answered ${removed.status} to the deletion`);

      return json(200, { deleted: true, analytics });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[account]', message);
      return json(message === 'not-configured' ? 503 : 502, {
        error: 'Your account could not be deleted just now. Please try again. Your sign-in still works until it is.',
      });
    }
  };
}
