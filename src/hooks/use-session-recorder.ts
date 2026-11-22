'use client';

import * as React from 'react';

import { MIN_RECORDED_SECONDS } from '@/data/stats';
import { toDateKey } from '@/lib/date';
import { useApp } from '@/providers/app-provider';

/** The most a killed app can lose of a sitting already over the minimum. */
const AUTOSAVE_MS = 15_000;

export interface SessionRecorder {
  /** Keep this in step with the live clock; read by the flush listeners. */
  elapsedRef: React.MutableRefObject<number>;
  /** Writes the sitting. Safe to call repeatedly — the store upserts by id. */
  commit: (completed: boolean, interim?: boolean) => void;
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
 *
 * A killed app fires neither event, so a running sitting is also saved every
 * few seconds.
 */
export function useSessionRecorder(meditationId: string): SessionRecorder {
  const { recordSession } = useApp();

  const elapsedRef = React.useRef(0);
  const startedAtRef = React.useRef(Date.now());
  const finishedRef = React.useRef(false);
  const finishedSecondsRef = React.useRef(0);
  const savedSecondsRef = React.useRef(0);

  const commit = React.useCallback(
    (completed: boolean, interim = false) => {
      // Once finished, the clock being rewound cannot shorten it.
      const seconds = Math.max(Math.round(elapsedRef.current), finishedSecondsRef.current);
      if (seconds < MIN_RECORDED_SECONDS) return;
      savedSecondsRef.current = seconds;

      recordSession(
        {
          id: `${meditationId}-${startedAtRef.current}`,
          meditationId,
          date: toDateKey(new Date(startedAtRef.current)),
          seconds,
          completed: completed || finishedRef.current,
          startedAt: startedAtRef.current,
        },
        { interim },
      );
    },
    [recordSession, meditationId],
  );

  const markFinished = React.useCallback(() => {
    finishedRef.current = true;
    finishedSecondsRef.current = Math.round(elapsedRef.current);
  }, []);

  const restart = React.useCallback(() => {
    finishedRef.current = false;
    finishedSecondsRef.current = 0;
    savedSecondsRef.current = 0;
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

    const autosave = window.setInterval(() => {
      if (finishedRef.current || Math.round(elapsedRef.current) === savedSecondsRef.current) return;
      commitRef.current(false, true);
    }, AUTOSAVE_MS);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(autosave);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, []);

  return { elapsedRef, commit, markFinished, restart };
}
