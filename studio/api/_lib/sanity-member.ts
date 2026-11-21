/**
 * Whether a Sanity token belongs to a member of Serenity's Sanity project.
 * The Studio's own server functions answer only those people.
 */

export const SANITY_PROJECT_ID = 'jn0rojao';

/** Tokens already checked, so a busy screen doesn't ask Sanity every time. */
const verified = new Map<string, number>();
const VERIFIED_FOR_MS = 5 * 60_000;

export async function isProjectMember(token: string): Promise<boolean> {
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

export function bearer(request: Request): string | undefined {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
}
