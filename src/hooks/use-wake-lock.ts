'use client';

import * as React from 'react';

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
};

/**
 * Holds the screen awake while `active`. Purely an enhancement — where the API
 * is missing or the request is refused, the timer still runs, the screen just
 * dims as usual. Re-acquired when the tab comes back, since the lock is dropped
 * automatically on hide.
 */
export function useWakeLock(active: boolean): void {
  React.useEffect(() => {
    if (!active) return undefined;

    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return undefined;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await nav.wakeLock!.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Refused (low battery, no permission) — not worth surfacing.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}
