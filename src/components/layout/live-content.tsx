'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import type { Content } from '@/content';
import { differsFromCurrent, fetchLatest, showContent, storedContent } from '@/content/live';
import { normalizePath } from '@/hooks/use-back';

/** How often to ask Sanity again while the app keeps running or returns from the background. */
const RECHECK_MS = 10 * 60_000;

/**
 * Screens where swapping the content is harmless: the browse tabs. Never
 * mid-session, mid-story, in a form or in the Kapwa chat, where redrawing the
 * screen would cut someone off.
 */
const SAFE_SCREENS = new Set(['/home', '/meditations', '/sleep', '/yoga']);

/**
 * Keeps the app's content in step with Sanity.
 *
 * The first render always uses the copy built into the app, so it matches the
 * prerendered page. Straight after, the copy kept from the last visit (when it
 * is newer than this build's) is shown, and a fresh one is fetched in the
 * background. A fresh copy is put on screen the next time the reader is on one
 * of the browse tabs, by redrawing the screens below with the new content;
 * playback and everything above (account, audio, settings) carry on untouched.
 *
 * "Next time" means arriving at one, never while on it: redrawing the screen
 * someone is using stopped a sleep sound, reset its timer and lost a
 * half-written sleep log, and closed an open menu or video on Home.
 */
export function LiveContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const safe = SAFE_SCREENS.has(normalizePath(pathname));
  const safeRef = React.useRef(safe);
  safeRef.current = safe;

  const [version, setVersion] = React.useState(0);
  const pending = React.useRef<Content | null>(null);
  const lastCheck = React.useRef(0);

  const offer = React.useCallback((next: Content) => {
    if (differsFromCurrent(next)) pending.current = next;
  }, []);

  const check = React.useCallback(() => {
    lastCheck.current = Date.now();
    void fetchLatest().then((fresh) => {
      if (fresh) offer(fresh);
    });
  }, [offer]);

  // On launch: the copy kept from last time, then a fresh one. Nothing is
  // playing yet at launch, so the kept copy goes straight on, whatever the
  // screen; only a copy that arrives later waits for a browse tab.
  React.useEffect(() => {
    const stored = storedContent();
    if (stored && differsFromCurrent(stored) && showContent(stored)) setVersion((v) => v + 1);
    check();
  }, [check]);

  // Back from the background, or a long stay open: look again.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > RECHECK_MS) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current > RECHECK_MS) check();
    }, RECHECK_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [check]);

  // A copy that arrived meanwhile goes on as a browse tab is arrived at, when
  // that screen is being drawn afresh anyway.
  React.useEffect(() => {
    if (safe && pending.current) {
      const next = pending.current;
      pending.current = null;
      if (showContent(next)) setVersion((v) => v + 1);
    }
  }, [safe, pathname]);

  return <React.Fragment key={version}>{children}</React.Fragment>;
}
