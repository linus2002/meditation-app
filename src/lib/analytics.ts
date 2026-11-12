import posthog from 'posthog-js';

/**
 * Product analytics and session replay, through PostHog.
 *
 * Nothing is sent until the reader agrees: the SDK starts opted out, and only
 * the "Share usage" choice (the consent card, or the toggle on Profile) opts it
 * in. Without a key in the environment every call here is a no-op, so a build
 * without one is still a complete app.
 *
 * What a replay may show is kept narrow on purpose. Every typed input is
 * masked, anything marked `data-private` is blocked outright, and recording
 * pauses entirely on the screens that hold personal entries.
 */

// Written out in full so Next inlines them at build time.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

/** Screens whose content is the reader's own: recording stops while on them. */
const PRIVATE_ROUTES = ['/reflections', '/assessment', '/support'];

let started = false;

export function analyticsAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(key);
}

function ready(): boolean {
  return started && !posthog.has_opted_out_capturing();
}

/** Starts the SDK once. Safe to call repeatedly. */
export function initAnalytics(): void {
  if (started || !analyticsAvailable()) return;
  posthog.init(key!, {
    api_host: host,
    defaults: '2026-08-30',
    // Page views follow client-side navigation, which is all this app has.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    // Guests stay anonymous; a profile exists only for signed-in accounts.
    person_profiles: 'identified_only',
    opt_out_capturing_by_default: true,
    session_recording: {
      maskAllInputs: true,
      blockSelector: '[data-private]',
    },
  });
  started = true;
}

/** Applies the reader's choice. Off also stops anything already recording. */
export function setAnalyticsConsent(allowed: boolean): void {
  if (!started) return;
  if (allowed) {
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  } else if (!posthog.has_opted_out_capturing()) {
    posthog.stopSessionRecording();
    posthog.opt_out_capturing();
    pausedForRoute = false;
  }
}

let pausedForRoute = false;

/**
 * Pauses replay on private screens and resumes it on leaving them. It only
 * resumes what it paused, so the project's own replay settings still decide
 * whether a session is recorded at all.
 */
export function syncRecordingForRoute(pathname: string): void {
  if (!ready()) return;
  const isPrivate = PRIVATE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isPrivate && !pausedForRoute) {
    posthog.stopSessionRecording();
    pausedForRoute = true;
  } else if (!isPrivate && pausedForRoute) {
    posthog.startSessionRecording();
    pausedForRoute = false;
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

/**
 * On sign-out, so the next person on this phone starts as a new guest.
 * `reset()` also clears consent back to opted out, so the reader's existing
 * choice is applied again straight after.
 */
export function resetUser(allowed: boolean): void {
  if (!started) return;
  posthog.reset();
  setAnalyticsConsent(allowed);
}
