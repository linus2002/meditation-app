import { bearer } from './_lib/sanity-member.js';
import { createSupport, pickSupportEnv } from './_lib/support.js';

/**
 * Help & support, for the app (web and phone): POST /api/support with the
 * person's Supabase sign-in as a Bearer token and a JSON body
 * { action: 'list' | 'get' | 'create' | 'reply' | 'close', ... }.
 *
 * Every answer is limited to that person's own conversations; see
 * _lib/support.ts. The app runs on other addresses (the website, and
 * https://localhost inside the Android app), so this answers any origin: it
 * uses no cookies, only the token, so that is safe.
 */

const support = createSupport(pickSupportEnv(process.env));

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

async function respond(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json(405, { error: 'Use POST.' });

  const token = bearer(request);
  if (!token) return json(401, { error: 'Sign in to contact support.' });

  const reply = await support.safely(async () => {
    const user = await support.whoIs(token);
    if (!user) return { status: 401, body: { error: 'Sign in with your email to contact support.' } };
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return support.forUser(user, payload);
  });
  return json(reply.status, reply.body);
}

export const POST = respond;
export const OPTIONS = respond;
