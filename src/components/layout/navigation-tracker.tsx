'use client';

import { useTrackNavigation } from '@/hooks/use-back';

/** Lets `useBack` tell a cold-opened screen from one reached inside the app. */
export function NavigationTracker() {
  useTrackNavigation();
  return null;
}
