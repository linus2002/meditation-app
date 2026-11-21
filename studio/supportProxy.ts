import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

import { createSupport, pickSupportEnv } from './api/_lib/support';

/**
 * Lets the local Studio's Support tab read and answer conversations without the
 * browser ever holding the database password.
 *
 * The tab calls `/support-api` on the dev server; this middleware answers with
 * DATABASE_URL from studio/.env.local (kept out of git). The hosted Studio gets
 * the same answers from api/support-admin.ts, which also checks the caller is a
 * member of the Sanity project. The shared logic lives in api/_lib/support.ts.
 */
export function supportProxy(): Plugin {
  return {
    name: 'serenity-support-proxy',
    configureServer(server) {
      const env = pickSupportEnv(loadEnv('development', process.cwd(), ['DATABASE_', 'POSTGRES_', 'SUPABASE_']), process.env);
      const support = createSupport(env);

      server.middlewares.use('/support-api', async (req, res) => {
        const raw = await readBody(req);
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(raw || '{}') as Record<string, unknown>;
        } catch {
          // An empty or broken body is answered as an unknown request.
        }
        const reply = await support.safely(() => support.forAdmin(payload), true);
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
