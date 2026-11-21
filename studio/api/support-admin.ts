import { bearer, isProjectMember } from './_lib/sanity-member.js';
import { createSupport, pickSupportEnv } from './_lib/support.js';

/**
 * The Studio's Support tab: POST /support-api (vercel.json routes it here) with
 * the editor's Sanity token and a JSON body
 * { action: 'counts' | 'list' | 'get' | 'reply' | 'status', ... }.
 *
 * Because this URL is public, only members of the Sanity project get an
 * answer; anyone else gets 401. See _lib/support.ts.
 */

const support = createSupport(pickSupportEnv(process.env));

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function respond(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Use POST.' });
  const token = bearer(request);
  if (!token) return json(401, { error: 'Sign in to the Studio to see support conversations.' });
  try {
    if (!(await isProjectMember(token))) return json(401, { error: 'Only Serenity editors can see support conversations.' });
  } catch {
    return json(502, { error: 'Could not check your Sanity sign-in.' });
  }
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reply = await support.safely(() => support.forAdmin(payload));
  return json(reply.status, reply.body);
}

export const POST = respond;
