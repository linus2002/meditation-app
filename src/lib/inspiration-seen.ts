/**
 * Whether today's inspiration has been read in the app, so the bell can show
 * a small dot until it has. One local date is stored; nothing else.
 */

import { personalKey } from '@/lib/account-scope';

const SEEN_KEY = 'serenity.inspiration.seen.v1';

export function lastSeenInspiration(): string | null {
  try {
    return window.localStorage.getItem(personalKey(SEEN_KEY));
  } catch {
    return null;
  }
}

export function markInspirationSeen(dateKey: string): void {
  try {
    window.localStorage.setItem(personalKey(SEEN_KEY), dateKey);
  } catch {
    // At worst the dot shows once more than it should.
  }
}
