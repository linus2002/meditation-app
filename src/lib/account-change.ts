import { accountHasChanged, storedAccount } from '@/lib/account-scope';
import { track } from '@/lib/analytics';
import { safePath } from '@/lib/safe-path';

const JUST_SIGNED_IN = 'serenity.just-signed-in';

let leaving = false;

/**
 * Loads a fresh page when someone signs in or out, here or in another tab,
 * which is what keeps readers apart (see lib/account-scope). From the sign-in
 * screen that page is where they were headed. Returns whether it is happening.
 */
export function followAccountChange(): boolean {
  if (typeof window === 'undefined' || !accountHasChanged()) return false;
  if (leaving) return true;
  leaving = true;

  if (storedAccount()) {
    try {
      window.sessionStorage.setItem(JUST_SIGNED_IN, '1');
    } catch {
      // Only the analytics event is lost.
    }
  } else {
    track('signed_out');
  }

  const { pathname, search } = window.location;
  const here = pathname.replace(/\/$/, '');
  if (here === '/login' || here === '/welcome') {
    window.location.replace(safePath(new URLSearchParams(search).get('next')) ?? '/home');
  } else {
    window.location.reload();
  }
  return true;
}

/** True once, on the page that follows a sign-in. */
export function takeJustSignedIn(): boolean {
  try {
    const value = window.sessionStorage.getItem(JUST_SIGNED_IN) === '1';
    window.sessionStorage.removeItem(JUST_SIGNED_IN);
    return value;
  } catch {
    return false;
  }
}
