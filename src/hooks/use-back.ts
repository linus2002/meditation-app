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
 */
export function useBack(fallbackHref = '/home'): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.push(fallbackHref);
  }, [router, fallbackHref]);
}
