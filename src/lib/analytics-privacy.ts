/**
 * The last check on everything analytics sends.
 *
 * An allowlist, so whatever the SDK learns to capture next stays off until
 * someone adds it here on purpose.
 */

const ALLOWED_EVENTS = new Set([
  '$pageview',
  '$pageleave',
  '$identify',
  '$set',
  '$opt_in',
  'signed_in',
  'signed_out',
  'onboarding_completed',
  'session_recorded',
  'session_completed',
  'reflection_saved',
  'sleep_logged',
  'meditation_rated',
  'assessment_completed',
]);

/** Screens whose very visit says something private. */
const PRIVATE_ROUTES = ['/reflections', '/assessment', '/support', '/kapwa', '/help'];
const REDACTED = '/private';

function isPrivatePath(path: string): boolean {
  return PRIVATE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

/** An address with no query or hash, and no private path. */
function scrubAddress(value: string): string {
  const bare = value.split(/[?#]/)[0];
  const origin = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i.exec(bare)?.[0] ?? '';
  const path = bare.slice(origin.length);
  return isPrivatePath(path) ? `${origin}${REDACTED}` : bare;
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return /^(https?|capacitor):\/\/|^\//.test(value) ? scrubAddress(value) : value;
  if (Array.isArray(value)) return value.map(scrub);
  // Dates and the like pass through as they are.
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, scrub(entry)]));
  }
  return value;
}

export function scrubEvent<T extends { event: string; properties: Record<string, unknown> }>(
  event: T | null,
): T | null {
  if (!event || !ALLOWED_EVENTS.has(event.event)) return null;

  const path = event.properties.$pathname;
  const visit = event.event === '$pageview' || event.event === '$pageleave';
  if (visit && typeof path === 'string' && isPrivatePath(path)) return null;

  const clean = scrub({ ...event }) as T;
  // "Only you ever see this", the stars say: that a rating happened, never what it was.
  delete clean.properties.score;
  return clean;
}
