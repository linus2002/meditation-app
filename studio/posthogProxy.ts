import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

import { createAnalyticsHandler, pickEnv } from './api/_lib/analytics';

/**
 * Lets the local Studio's Analytics tab ask PostHog and Supabase for numbers
 * without the browser ever holding a key.
 *
 * The tab calls `/posthog-api/...` on the dev server; this middleware answers
 * with the keys from studio/.env.local (kept out of git). The hosted Studio
 * gets the same answers from api/posthog-api.ts instead. The shared logic and
 * the list of variables live in api/_lib/analytics.ts.
 */
export function posthogProxy(): Plugin {
  return {
    name: 'serenity-posthog-proxy',
    configureServer(server) {
      const env = pickEnv(loadEnv('development', process.cwd(), ['POSTHOG_', 'SUPABASE_']), process.env);
      const handle = createAnalyticsHandler(env);

      server.middlewares.use('/posthog-api', async (req, res) => {
        const reply = await handle(req.method ?? 'GET', req.url ?? '/', await readBody(req));
        res.statusCode = reply.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(reply.body));
      });
    },
  };
}

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
