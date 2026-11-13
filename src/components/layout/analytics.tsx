'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

import {
  analyticsAvailable,
  identifyUser,
  initAnalytics,
  resetUser,
  setAnalyticsConsent,
  syncRecordingForRoute,
  track,
} from '@/lib/analytics';
import { getSupabase } from '@/lib/supabase/client';
import { useApp } from '@/providers/app-provider';

/** Settings key for the reader's choice; also a toggle on Profile. */
export const ANALYTICS_SETTING = 'analytics';
/** Set once the consent card has been answered, either way. */
const ASKED_SETTING = 'analyticsAsked';

/**
 * Keeps PostHog in step with the app: the reader's consent, the signed-in
 * account, and whether the current screen may be recorded. Renders the
 * one-time consent card on Home.
 */
export function Analytics() {
  const { hydrated, onboarded, settings, setSetting } = useApp();
  const pathname = usePathname() ?? '';
  const allowed = settings[ANALYTICS_SETTING] === true;
  const allowedRef = React.useRef(allowed);
  allowedRef.current = allowed;

  React.useEffect(() => {
    if (!hydrated) return;
    initAnalytics();
    setAnalyticsConsent(allowed);
    if (allowed) syncRecordingForRoute(window.location.pathname);
  }, [hydrated, allowed]);

  React.useEffect(() => {
    syncRecordingForRoute(pathname);
  }, [pathname]);

  // Follows sign-in and sign-out. Anonymous accounts (video likes) are guests.
  React.useEffect(() => {
    if (!hydrated || !allowed) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (user && !user.is_anonymous) {
        identifyUser(user.id);
        if (event === 'SIGNED_IN') track('signed_in');
      } else if (event === 'SIGNED_OUT') {
        track('signed_out');
        resetUser(allowedRef.current);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [hydrated, allowed]);

  const ask =
    hydrated &&
    onboarded &&
    pathname === '/home' &&
    settings[ASKED_SETTING] !== true &&
    analyticsAvailable();

  if (!ask) return null;

  const answer = (yes: boolean) => {
    setSetting(ANALYTICS_SETTING, yes);
    setSetting(ASKED_SETTING, true);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="analytics-consent-title"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto w-full max-w-[398px] rounded-tile bg-surface px-4 py-3.5 shadow-pill">
        <div className="flex items-start gap-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
            <BarChart3 className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p id="analytics-consent-title" className="text-body-sm font-medium leading-tight text-ink">
              Help improve Serenity?
            </p>
            <p className="mt-1 text-label leading-snug text-ink-muted">
              Share how you move through the app, so we can see what helps. Your reflections,
              answers and anything you type are never recorded. You can change this on Profile.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(false)}
            className="h-10 rounded-xl px-4 text-body-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="h-10 rounded-xl bg-aurora-blue px-4 text-body-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
