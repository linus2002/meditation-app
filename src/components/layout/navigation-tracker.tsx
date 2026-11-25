'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { recordScreen } from '@/lib/activity-log';
import { trackHistoryDepth } from '@/lib/history-depth';
import { watchInstallPrompt } from '@/lib/install-prompt';

// As this module loads, before Next.js records its first entry, and before the
// browser makes its one offer to install the app.
trackHistoryDepth();
watchInstallPrompt();

/**
 * Lets `useBack` tell a cold-opened screen from one reached inside the app,
 * and notes each screen for Kapwa when the reader has allowed it
 * (lib/activity-log; nothing is kept otherwise).
 */
export function NavigationTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    if (pathname) recordScreen(pathname);
  }, [pathname]);
  return null;
}
