'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { hasEarlierScreen } from '@/lib/history-depth';

/**
 * Whether there is an earlier screen in this visit. A screen opened cold, from
 * a reminder, a shared link or a relaunched home-screen app, has none. Read
 * from the history entry itself (lib/history-depth), so a screen that replaced
 * another is not mistaken for one with somewhere to go back to.
 */
export function canGoBackInApp(): boolean {
  return hasEarlierScreen();
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
