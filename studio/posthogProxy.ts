import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/**
 * Lets the Analytics tab ask PostHog for numbers without the browser ever
 * holding the key.
 *
 * The Studio page calls `/posthog-api/...` on its own dev server; this
 * middleware adds the personal API key (read from studio/.env.local, which is
 * kept out of git) and forwards the request to PostHog. It only exists under
 * `sanity dev`, so a deployed Studio never carries the key. The variables are
 * deliberately not prefixed SANITY_STUDIO_, which would bundle them into the page.
 *
 *   POSTHOG_PERSONAL_API_KEY  phx_... with the "query:read" and "project:read" scopes
 *   POSTHOG_PROJECT_ID        the number in PostHog's address bar (/project/12345);
 *                             needed when the key has no "Project: read" scope
 *   POSTHOG_APP_HOST          optional; https://us.posthog.com by default
 *   SUPABASE_URL              the app's Supabase project address
 *   SUPABASE_SERVICE_ROLE_KEY for the Users tab's names and emails, looked up
 *                             in Supabase Auth by account id. It bypasses all
 *                             row security, so it must never leave this file's
 *                             server side or this computer.
 */
export function posthogProxy(): Plugin {
  return {
    name: 'serenity-posthog-proxy',
    configureServer(server) {
      const env = { ...loadEnv('development', process.cwd(), ['POSTHOG_', 'SUPABASE_']), ...pick(process.env) };
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

      server.middlewares.use('/posthog-api', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };

        // Names and emails come from Supabase, never from PostHog.
        if (req.method === 'POST' && req.url?.startsWith('/people')) {
          if (!supabaseUrl || !serviceKey) return send(503, { error: 'people-not-configured' });
          try {
            const { ids } = JSON.parse(await readBody(req)) as { ids?: unknown };
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
            return send(200, { people: found });
          } catch (error) {
            return send(502, { error: error instanceof Error ? error.message : 'Could not reach Supabase' });
          }
        }

        if (!key) return send(503, { error: 'not-configured' });

        try {
          if (req.method === 'GET' && req.url?.startsWith('/project')) {
            const upstream = await fetch(`${host}/api/projects/${project}/`, {
              headers: { Authorization: `Bearer ${key}` },
            });
            const data = (await upstream.json()) as { id?: number; name?: string; detail?: string };
            // A key with only "Query: read" cannot read the project itself; a
            // numeric POSTHOG_PROJECT_ID is enough for the links in that case.
            if (!upstream.ok && /^\d+$/.test(project)) return send(200, { id: Number(project), name: '', host });
            if (!upstream.ok) return send(upstream.status, { error: data.detail ?? 'PostHog refused the key' });
            return send(200, { id: data.id, name: data.name, host });
          }

          if (req.method === 'POST' && req.url?.startsWith('/query')) {
            const body = await readBody(req);
            const { query } = JSON.parse(body) as { query: string };
            const upstream = await fetch(`${host}/api/projects/${project}/query/`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
            });
            const data = (await upstream.json()) as { results?: unknown[][]; detail?: string };
            if (!upstream.ok) return send(upstream.status, { error: data.detail ?? 'Query failed' });
            return send(200, { results: data.results ?? [] });
          }

          send(404, { error: 'Unknown route' });
        } catch (error) {
          send(502, { error: error instanceof Error ? error.message : 'Could not reach PostHog' });
        }
      });
    },
  };
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

function pick(source: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of [
    'POSTHOG_PERSONAL_API_KEY',
    'POSTHOG_PROJECT_ID',
    'POSTHOG_APP_HOST',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    if (source[name]) out[name] = source[name] as string;
  }
  return out;
}

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
