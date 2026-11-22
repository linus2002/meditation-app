'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

import { takeJustSignedIn } from '@/lib/account-change';
import { personalAccountId } from '@/lib/account-scope';
import { analyticsAvailable, identifyUser, setAnalyticsConsent, track } from '@/lib/analytics';
import { normalizePath } from '@/hooks/use-back';
import { useApp } from '@/providers/app-provider';

/** Settings key for the reader's choice; also a toggle on Profile. */
export const ANALYTICS_SETTING = 'analytics';
/** Set once the consent card has been answered, either way. */
const ASKED_SETTING = 'analyticsAsked';

/**
 * Keeps PostHog in step with the app: this reader's consent, and their
 * account. A change of account is a fresh page (lib/account-change), so
 * neither can change hands underneath it. Renders the one-time consent card
 * on Home.
 */
export function Analytics() {
  const { hydrated, onboarded, settings, setSetting } = useApp();
  const pathname = usePathname() ?? '';
  const allowed = settings[ANALYTICS_SETTING] === true;

  React.useEffect(() => {
    if (!hydrated) return;
    setAnalyticsConsent(allowed);

    const signedIn = takeJustSignedIn();
    const userId = personalAccountId();
    if (!allowed || !userId) return;
    identifyUser(userId);
    if (signedIn) track('signed_in');
  }, [hydrated, allowed]);

  const ask =
    hydrated &&
    onboarded &&
    // The app build adds a trailing slash (/home/), so compare the bare path.
    normalizePath(pathname) === '/home' &&
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
              Share which screens you open and sessions you play. Your reflections, answers and
              anything you type are never recorded. You can change this on Profile.
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
