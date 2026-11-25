import { personalKey } from '@/lib/account-scope';
import type { PersonalConsent, RecentScreen } from '@/lib/kapwa-profile';

/**
 * The screens someone opened recently, and when they were last in the app,
 * so Kapwa can answer “what was I doing?”.
 *
 * Kept on this phone only, per account (so deleting the account erases it,
 * see lib/account-deletion), and only while the reader lets Kapwa use their
 * activity: nothing is recorded before they say yes, and saying no deletes
 * it. At most the last 15 screens, and nothing older than 30 days.
 */

const LOG_KEY = 'serenity.activity.v1';
const CONSENT_KEY = 'serenity.kapwa.personal.v1';
const MAX_SCREENS = 15;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Away longer than this, coming back counts as a new visit. */
const NEW_VISIT_MS = 30 * 60 * 1000;

export interface ActivityLog {
  screens: RecentScreen[];
  lastSeenAt?: number;
  /** When the visit before this one was. */
  previousVisitAt?: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(personalKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === undefined) window.localStorage.removeItem(personalKey(key));
    else window.localStorage.setItem(personalKey(key), JSON.stringify(value));
  } catch {
    // Without storage, Kapwa simply has less to look back on.
  }
}

export function readConsent(): PersonalConsent {
  const value = read<string | null>(CONSENT_KEY, null);
  return value === 'yes' || value === 'no' ? value : undefined;
}

/** Saying no also deletes what was kept. */
export function setConsent(value: 'yes' | 'no'): void {
  write(CONSENT_KEY, value);
  if (value === 'no') write(LOG_KEY, undefined);
}

export function readActivity(now = Date.now()): ActivityLog {
  const log = read<ActivityLog>(LOG_KEY, { screens: [] });
  return { ...log, screens: (log.screens ?? []).filter((screen) => now - screen.at < MAX_AGE_MS) };
}

/** The visit-tracking rule, kept pure for tests. */
export function withScreen(log: ActivityLog, path: string, now: number): ActivityLog {
  const previousVisitAt =
    log.lastSeenAt !== undefined && now - log.lastSeenAt > NEW_VISIT_MS ? log.lastSeenAt : log.previousVisitAt;
  const screens = log.screens[0]?.path === path ? log.screens : [{ path, at: now }, ...log.screens];
  return {
    screens: screens.filter((screen) => now - screen.at < MAX_AGE_MS).slice(0, MAX_SCREENS),
    lastSeenAt: now,
    previousVisitAt,
  };
}

/** Notes a screen, if the reader has let Kapwa use their activity. */
export function recordScreen(path: string, now = Date.now()): void {
  if (readConsent() !== 'yes') return;
  write(LOG_KEY, withScreen(readActivity(now), path, now));
}
