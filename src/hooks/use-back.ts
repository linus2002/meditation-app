'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * How many screens this visit has shown. A screen opened cold — from a
 * reminder, a shared link or a relaunched home-screen app — is the first, and
 * has nothing inside the app to go back to.
 */
let screensShown = 0;

/** Counts screen changes. Mounted once, in the root layout. */
export function useTrackNavigation(): void {
  const pathname = usePathname();
  React.useEffect(() => {
    screensShown += 1;
  }, [pathname]);
}

export function canGoBackInApp(): boolean {
  // The Navigation API only lists this app's own entries, so it answers the
  // question exactly where it exists (Chromium, recent Safari).
  const navigation = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof navigation?.canGoBack === 'boolean') return navigation.canGoBack;
  return screensShown > 1;
}

/**
 * A Back action that never leads out of the app or nowhere: it steps back when
 * there is an earlier screen in this visit, and otherwise opens `fallbackHref`.
 *
 * The fallback replaces rather than pushes. Pushing left the cold-opened screen
 * underneath, so the next Back from home led straight back into it.
 */
export function useBack(fallbackHref = '/home'): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.replace(fallbackHref);
  }, [router, fallbackHref]);
}

/** The bottom-bar destinations. Each is a root: Back from one goes home. */
export const TAB_ROOTS = ['/home', '/meditations', '/kapwa', '/yoga', '/sleep'] as const;

/** `/home/` and `/home` are the same screen (the app build adds the slash). */
export function normalizePath(pathname: string | null): string {
  if (!pathname) return '/';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function isTabRoot(pathname: string | null): boolean {
  return (TAB_ROOTS as readonly string[]).includes(normalizePath(pathname));
}
