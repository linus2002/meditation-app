/**
 * The Analytics tab's private side: it holds the PostHog and Supabase keys and
 * answers the tab's three requests. Two places run it, never the browser:
 *
 *   - posthogProxy.ts, under `sanity dev` on this computer (keys from studio/.env.local)
 *   - api/posthog-api.ts, a Vercel function for the hosted Studio (keys from the
 *     Vercel project's environment variables), which first checks the caller
 *     is a signed-in member of the Sanity project
 *
 *   POSTHOG_PERSONAL_API_KEY  phx_... with the "query:read" and "project:read" scopes
 *   POSTHOG_PROJECT_ID        the number in PostHog's address bar (/project/12345);
 *                             needed when the key has no "Project: read" scope
 *   POSTHOG_APP_HOST          optional; https://us.posthog.com by default
 *   SUPABASE_URL              the app's Supabase project address
 *   SUPABASE_SERVICE_ROLE_KEY for the Users tab's names and emails, looked up in
 *                             Supabase Auth by account id. It bypasses all row
 *                             security, so it must only ever live server side.
 *
 * None of these may be prefixed SANITY_STUDIO_, which would bundle them into the page.
 */

export const ENV_NAMES = [
  'POSTHOG_PERSONAL_API_KEY',
  'POSTHOG_PROJECT_ID',
  'POSTHOG_APP_HOST',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export type AnalyticsEnv = Partial<Record<(typeof ENV_NAMES)[number], string>>;

export interface Reply {
  status: number;
  body: unknown;
}

interface Person {
  email: string | null;
  name: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  provider: string | null;
}

interface SupabaseUser {
  email?: string;
  is_anonymous?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: { provider?: string };
}

/** Builds the handler once per process, so the people cache lives across requests. */
export function createAnalyticsHandler(env: AnalyticsEnv) {
  const key = env.POSTHOG_PERSONAL_API_KEY;
  const project = env.POSTHOG_PROJECT_ID || '@current';
  const host = (env.POSTHOG_APP_HOST || 'https://us.posthog.com').replace(/\/$/, '');
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const people = new Map<string, { at: number; person: Person | null }>();

  /** One account from Supabase Auth, cached for five minutes. */
  async function lookUp(id: string): Promise<Person | null> {
    const hit = people.get(id);
    if (hit && Date.now() - hit.at < 5 * 60_000) return hit.person;
    // New-style secret keys (sb_secret_...) go in `apikey` alone; the
    // older service_role key is a JWT and also goes in Authorization.
    const headers: Record<string, string> = { apikey: serviceKey! };
    if (!serviceKey!.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`;
    const upstream = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, { headers });
    let person: Person | null = null;
    if (upstream.ok) {
      const user = (await upstream.json()) as SupabaseUser;
      const meta = user.user_metadata ?? {};
      const name = [meta.first_name, meta.last_name].filter((v) => typeof v === 'string' && v.trim()).join(' ');
      if (!user.is_anonymous) {
        person = {
          email: user.email ?? null,
          name: name || (typeof meta.full_name === 'string' ? meta.full_name : null),
          createdAt: user.created_at ?? null,
          lastSignIn: user.last_sign_in_at ?? null,
          provider: user.app_metadata?.provider ?? null,
        };
      }
    } else if (upstream.status !== 404) {
      throw new Error(`Supabase answered ${upstream.status}`);
    }
    people.set(id, { at: Date.now(), person });
    return person;
  }

  /** `route` is the part after /posthog-api, e.g. "/query". */
  return async function handle(method: string, route: string, body: string): Promise<Reply> {
    // Names and emails come from Supabase, never from PostHog.
    if (method === 'POST' && route.startsWith('/people')) {
      if (!supabaseUrl || !serviceKey) return { status: 503, body: { error: 'people-not-configured' } };
      try {
        const { ids } = JSON.parse(body || '{}') as { ids?: unknown };
        const wanted = [...new Set(Array.isArray(ids) ? ids : [])]
          .filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))
          .slice(0, 1000);
        const found: Record<string, Person> = {};
        for (let i = 0; i < wanted.length; i += 10) {
          const batch = wanted.slice(i, i + 10);
          const results = await Promise.all(batch.map(lookUp));
          batch.forEach((id, j) => {
            if (results[j]) found[id] = results[j]!;
          });
        }
        return { status: 200, body: { people: found } };
      } catch (error) {
        return { status: 502, body: { error: error instanceof Error ? error.message : 'Could not reach Supabase' } };
      }
    }

    if (!key) return { status: 503, body: { error: 'not-configured' } };

    try {
      if (method === 'GET' && route.startsWith('/project')) {
        const upstream = await fetch(`${host}/api/projects/${project}/`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        const data = (await upstream.json()) as { id?: number; name?: string; detail?: string };
        // A key with only "Query: read" cannot read the project itself; a
        // numeric POSTHOG_PROJECT_ID is enough for the links in that case.
        if (!upstream.ok && /^\d+$/.test(project)) return { status: 200, body: { id: Number(project), name: '', host } };
        if (!upstream.ok) {
          // Name the missing setting, never its value, so a hosted Studio can be fixed from its own screen.
          const hint = env.POSTHOG_PROJECT_ID
            ? 'POSTHOG_PROJECT_ID should be the number after /project/ in PostHog’s address bar.'
            : 'POSTHOG_PROJECT_ID is not set for this deployment.';
          return {
            status: upstream.status,
            body: { error: `PostHog refused the key (${upstream.status}${data.detail ? `: ${data.detail}` : ''}). ${hint}` },
          };
        }
        return { status: 200, body: { id: data.id, name: data.name, host } };
      }

      if (method === 'POST' && route.startsWith('/query')) {
        const { query } = JSON.parse(body || '{}') as { query: string };
        const upstream = await fetch(`${host}/api/projects/${project}/query/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          // Always recalculate: PostHog otherwise may answer from a cached
          // result, so a fresh event could stay missing until it expires.
          body: JSON.stringify({ query: { kind: 'HogQLQuery', query }, refresh: 'force_blocking' }),
        });
        const data = (await upstream.json()) as { results?: unknown[][]; detail?: string };
        if (!upstream.ok) return { status: upstream.status, body: { error: data.detail ?? 'Query failed' } };
        return { status: 200, body: { results: data.results ?? [] } };
      }

      return { status: 404, body: { error: 'Unknown route' } };
    } catch (error) {
      return { status: 502, body: { error: error instanceof Error ? error.message : 'Could not reach PostHog' } };
    }
  };
}

/** The variables above, from any source (process.env, Vite's loadEnv). */
export function pickEnv(...sources: Record<string, string | undefined>[]): AnalyticsEnv {
  const out: AnalyticsEnv = {};
  for (const source of sources) {
    for (const name of ENV_NAMES) {
      // Pasted values often bring spaces, line breaks or quotes along; PostHog
      // and Supabase would refuse the key over them.
      const value = source[name]?.trim().replace(/^(["'])(.*)\1$/, '$2').trim();
      if (value) out[name] = value;
    }
  }
  return out;
}
