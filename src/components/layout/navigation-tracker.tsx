'use client';

import { trackHistoryDepth } from '@/lib/history-depth';
import { watchInstallPrompt } from '@/lib/install-prompt';

// As this module loads, before Next.js records its first entry, and before the
// browser makes its one offer to install the app.
trackHistoryDepth();
watchInstallPrompt();

/** Lets `useBack` tell a cold-opened screen from one reached inside the app. */
export function NavigationTracker() {
  return null;
}
