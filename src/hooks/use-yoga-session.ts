'use client';

import * as React from 'react';

import type { YogaPose } from '@/lib/yoga';

/**
 * The pose clock for a guided yoga session.
 *
 * Each pose counts down against the wall clock (so a backgrounded tab does not
 * drift), then the next begins on its own. Pausing keeps the time left in the
 * pose; resuming carries on from there.
 */
export function useYogaSession(
  poses: YogaPose[],
  {
    onPoseStart,
    onFinish,
  }: {
    /** Called as each pose begins — the player strikes its bell here. */
    onPoseStart?: (index: number) => void;
    onFinish?: () => void;
  } = {},
) {
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState(poses[0]?.seconds ?? 0);
  const [running, setRunning] = React.useState(false);
  // Bumped whenever a pose starts, so the clock re-arms even while running.
  const [armed, setArmed] = React.useState(0);

  const indexRef = React.useRef(0);
  const remainingRef = React.useRef(poses[0]?.seconds ?? 0);
  const handlers = React.useRef({ onPoseStart, onFinish });
  handlers.current = { onPoseStart, onFinish };

  const goTo = React.useCallback(
    (next: number) => {
      if (next >= poses.length) {
        setRunning(false);
        handlers.current.onFinish?.();
        return;
      }
      indexRef.current = next;
      remainingRef.current = poses[next].seconds;
      setIndex(next);
      setRemaining(poses[next].seconds);
      setRunning(true);
      setArmed((value) => value + 1);
      handlers.current.onPoseStart?.(next);
    },
    [poses],
  );

  React.useEffect(() => {
    if (!running) return undefined;

    const deadline = Date.now() + remainingRef.current * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      remainingRef.current = left;
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        goTo(indexRef.current + 1);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [running, armed, goTo]);

  const begin = React.useCallback(() => goTo(0), [goTo]);
  const skip = React.useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const pause = React.useCallback(() => setRunning(false), []);
  const resume = React.useCallback(() => setRunning(true), []);

  return { index, remaining, running, begin, skip, pause, resume, stop: pause };
}
