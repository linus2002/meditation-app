'use client';

import * as React from 'react';

import { msUntilNextDay, toDateKey } from '@/lib/date';

/**
 * Today's local date key, kept current: it moves on at midnight and when the
 * app comes back to the foreground, so a screen left open overnight saves
 * under the right day. Null until mounted, because these pages are
 * prerendered and the build date must not decide what today is.
 */
export function useToday(): string | null {
  const [today, setToday] = React.useState<string | null>(null);

  React.useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      const now = new Date();
      setToday(toDateKey(now));
      window.clearTimeout(timer);
      // A beat past midnight, so the new day has begun.
      timer = window.setTimeout(refresh, msUntilNextDay(now) + 1000);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}
