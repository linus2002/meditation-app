import { createAnalyticsHandler, pickEnv } from './_lib/analytics.js';

/**
 * The hosted Studio's Analytics tab: the same answers as the local dev proxy,
 * from a Vercel function. vercel.json routes /posthog-api/<route> here.
 *
 * The keys sit in the Vercel project's environment variables. Because this URL
 * is public, every request must carry the caller's Sanity token, and only a
 * member of the Sanity project gets an answer; anyone else gets 401.
 */

const SANITY_PROJECT_ID = 'jn0rojao';

const handle = createAnalyticsHandler(pickEnv(process.env));

/** Tokens already checked, so a page of charts doesn't ask Sanity every time. */
const verified = new Map<string, number>();
const VERIFIED_FOR_MS = 5 * 60_000;

async function isProjectMember(token: string): Promise<boolean> {
  const at = verified.get(token);
  if (at && Date.now() - at < VERIFIED_FOR_MS) return true;
  // Sanity only shows a project to people (and robot tokens) that belong to it.
  const res = await fetch(`https://api.sanity.io/v2021-06-07/projects/${SANITY_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const project = (await res.json().catch(() => ({}))) as { id?: string };
  if (project.id !== SANITY_PROJECT_ID) return false;
  verified.set(token, Date.now());
  return true;
}

async function respond(request: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: 'Sign in to the Studio to see analytics.' });
  try {
    if (!(await isProjectMember(token))) return json(401, { error: 'Only Serenity editors can see analytics.' });
  } catch {
    return json(502, { error: 'Could not check your Sanity sign-in.' });
  }

  const route = '/' + (new URL(request.url).searchParams.get('route') ?? '').replace(/^\/+/, '');
  const body = request.method === 'POST' ? await request.text() : '';
  const reply = await handle(request.method, route, body);
  return json(reply.status, reply.body);
}

export const GET = respond;
export const POST = respond;
