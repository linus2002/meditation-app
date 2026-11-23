'use client';

import { trackHistoryDepth } from '@/lib/history-depth';

// As this module loads, before Next.js records its first entry.
trackHistoryDepth();

/** Lets `useBack` tell a cold-opened screen from one reached inside the app. */
export function NavigationTracker() {
  return null;
}
