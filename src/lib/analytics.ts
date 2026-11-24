import posthog from 'posthog-js';

import { personalScope } from '@/lib/account-scope';
import { scrubEvent } from '@/lib/analytics-privacy';

/**
 * Product analytics, through PostHog.
 *
 * The SDK is not even started until this reader agrees ("Share usage": the
 * consent card, or the toggle on Profile), so before that nothing is fetched
 * or sent. Consent and identity are kept per account, so neither passes to the
 * next person on the phone.
 *
 * Only screen visits and the named events below leave the phone. Autocapture
 * and session replay are off, and must stay off while the consent card says
 * answers are never recorded: both read what is on the screen, where button
 * labels and even which option is highlighted are the answers. Everything
 * sent also passes `scrubEvent` (lib/analytics-privacy).
 */

// Written out in full so Next inlines them at build time.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let started = false;

export function analyticsAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(key);
}

function ready(): boolean {
  return started && !posthog.has_opted_out_capturing();
}

function start(): void {
  if (started || !analyticsAvailable()) return;
  const reader = personalScope().replace(/[^a-z0-9-]/gi, '_');
  posthog.init(key!, {
    api_host: host,
    defaults: '2026-08-30',
    // Page views follow client-side navigation, which is all this app has.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Guests stay anonymous; a profile exists only for signed-in accounts.
    person_profiles: 'identified_only',
    opt_out_capturing_by_default: true,

    // One identity and one consent per reader, never the phone's.
    persistence: 'localStorage',
    persistence_name: `serenity_${reader}`,
    consent_persistence_name: `serenity_consent_${reader}`,

    // Everything that reads the screen, or fetches code that could.
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    mask_all_text: true,
    save_referrer: false,
    save_campaign_params: false,

    before_send: (event) => scrubEvent(event),
  });
  started = true;
}

/** Applies the reader's choice, starting the SDK the first time it is a yes. */
export function setAnalyticsConsent(allowed: boolean): void {
  if (allowed) {
    start();
    if (started && posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  } else if (started && !posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
}

/**
 * Records one product event. Properties must never carry what the reader
 * wrote or answered: ids, counts and durations only.
 */
export function track(event: string, properties?: Record<string, string | number | boolean>): void {
  if (!ready()) return;
  posthog.capture(event, properties);
}

/** Links what follows to a signed-in account, by its id and never its email. */
export function identifyUser(userId: string): void {
  if (!ready()) return;
  if (posthog.get_distinct_id() !== userId) posthog.identify(userId);
}
