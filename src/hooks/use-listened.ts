'use client';

import * as React from 'react';

import { advanceListened } from '@/lib/listening';

/**
 * Seconds actually heard since the last `reset`, following a session clock
 * (see lib/listening). Created before the clock exists, so callbacks defined
 * ahead of it can read `heardRef`; `follow` is then called with each reading,
 * during render.
 */
export function useListened() {
  const heardRef = React.useRef(0);
  const lastRef = React.useRef(0);

  const follow = (elapsed: number, running: boolean) => {
    heardRef.current = advanceListened(heardRef.current, lastRef.current, elapsed, running);
    lastRef.current = elapsed;
  };

  /** Starts counting afresh; `from` is where the clock now stands. */
  const reset = React.useCallback((from: number = 0) => {
    heardRef.current = 0;
    lastRef.current = from;
  }, []);

  return { heardRef, follow, reset };
}
