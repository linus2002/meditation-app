'use client';

import * as React from 'react';

import { MIN_RECORDED_SECONDS } from '@/data/stats';
import { toDateKey } from '@/lib/date';
import { useApp } from '@/providers/app-provider';

export interface SessionRecorder {
  /** Keep this in step with the live clock; read by the flush listeners. */
  elapsedRef: React.MutableRefObject<number>;
  /** Writes the sitting. Safe to call repeatedly — the store upserts by id. */
  commit: (completed: boolean) => void;
  /** Marks the sitting finished so no later flush can downgrade it. */
  markFinished: () => void;
  /** Opens a new record, for a second sit on the same screen. */
  restart: () => void;
}

/**
 * Shared recording behaviour for anything that counts as a sitting.
 *
 * A sitting has to survive more than a tidy React unmount: on a phone the app
 * is far more often backgrounded or killed outright, and React runs no cleanup
 * for that. So the sitting is flushed on `pagehide` and whenever the document
 * is hidden, as well as on unmount. Repeat commits are harmless because the
 * store upserts on the sitting's id, and a later flush can never downgrade one
 * that already ran to the end.
 */
export function useSessionRecorder(
  meditationId: string,
  { circleId }: { circleId?: string } = {},
): SessionRecorder {
  const { recordSession } = useApp();

  const elapsedRef = React.useRef(0);
  const startedAtRef = React.useRef(Date.now());
  const finishedRef = React.useRef(false);

  const commit = React.useCallback(
    (completed: boolean) => {
      const seconds = Math.round(elapsedRef.current);
      if (seconds < MIN_RECORDED_SECONDS) return;

      recordSession({
        id: `${meditationId}-${startedAtRef.current}`,
        meditationId,
        date: toDateKey(new Date(startedAtRef.current)),
        seconds,
        completed: completed || finishedRef.current,
        startedAt: startedAtRef.current,
        // A live circle sit; `CircleSync` tells the circle about it.
        ...(circleId ? { circleId } : {}),
      });
    },
    [recordSession, meditationId, circleId],
  );

  const markFinished = React.useCallback(() => {
    finishedRef.current = true;
  }, []);

  const restart = React.useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
  }, []);

  // Held in a ref so the listeners never re-subscribe, and so they cannot fire
  // mid-session merely because a dependency changed identity.
  const commitRef = React.useRef(commit);
  commitRef.current = commit;

  React.useEffect(() => {
    const flush = () => commitRef.current(false);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, []);

  return { elapsedRef, commit, markFinished, restart };
}
