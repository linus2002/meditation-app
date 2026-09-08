import type { UserProfile } from '@/types';

/**
 * The greeting on the home screen reads "Hello, Sherman" in the reference.
 * Streak, minutes and session counts are not stored here — they are derived
 * from real recorded sessions in `src/lib/session-stats.ts`.
 */
export const currentUser: UserProfile = {
  firstName: 'Sherman',
  lastName: 'Whitaker',
  initials: 'SW',
  memberSince: 'January 2023',
};
