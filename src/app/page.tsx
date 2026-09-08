'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useApp } from '@/providers/app-provider';

/**
 * The entry gate.
 *
 * A first-time visitor is sent through the three-step tour; everyone else goes
 * straight to the home screen. `onboarded` is read from localStorage, so this
 * waits for hydration before deciding rather than flashing the wrong screen.
 *
 * `router.replace` keeps the tour out of the back stack: finishing it and
 * pressing back should not drop you into onboarding again.
 */
export default function EntryPage() {
  const router = useRouter();
  const { onboarded, hydrated } = useApp();

  React.useEffect(() => {
    if (!hydrated) return;
    router.replace(onboarded ? '/home' : '/welcome');
  }, [hydrated, onboarded, router]);

  // Nothing to show while the stored flag is read — it takes one tick.
  return <div className="min-h-full bg-canvas" aria-hidden="true" />;
}
