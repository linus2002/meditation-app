'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { accountEmail, accountsAvailable, AUTH_CHANGE_EVENT } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Whether the reader is signed in.
 *
 * `member` is a real account with an email. An anonymous Supabase account (the
 * kind video likes create) is still a `guest`. A build with no way to sign in
 * at all treats everyone as a member, so missing keys never lock the app.
 */
export type AccountStatus = 'loading' | 'guest' | 'member';

let status: AccountStatus = 'loading';
let started = false;
const listeners = new Set<() => void>();

function set(next: AccountStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
}

function refresh() {
  void accountEmail()
    .catch(() => null)
    .then((email) => set(email ? 'member' : 'guest'));
}

/** Starts watching once, for the life of the page. */
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (!accountsAvailable()) {
    set('member');
    return;
  }
  refresh();
  // Supabase asks that its own calls are not made inside this callback, so the
  // re-read waits a tick.
  getSupabase()?.auth.onAuthStateChange(() => window.setTimeout(refresh, 0));
  window.addEventListener(AUTH_CHANGE_EVENT, refresh);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccountStatus(): AccountStatus {
  return React.useSyncExternalStore(
    subscribe,
    () => status,
    () => 'loading',
  );
}

/** The sign-in screen, set to come back to `next` afterwards. */
export function loginHref(next?: string): string {
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}

/** The current path and query, for `loginHref`. */
export function currentPath(): string {
  return window.location.pathname + window.location.search;
}

/**
 * For a control that starts something in place (a soundscape, say): returns a
 * check that is true for a member, and otherwise sends a guest to sign in.
 */
export function useRequireAccount(): () => boolean {
  const accountStatus = useAccountStatus();
  const router = useRouter();
  return React.useCallback(() => {
    if (accountStatus === 'member') return true;
    if (accountStatus === 'guest') router.push(loginHref(currentPath()));
    return false;
  }, [accountStatus, router]);
}
