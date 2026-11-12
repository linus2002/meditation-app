'use client';

import * as React from 'react';

import { audioEngine } from '@/lib/audio/engine';
import { watchForFreeze } from '@/lib/audio/freeze';
import type { YogaPose } from '@/lib/yoga';

/** How long before a pose ends `onPoseEnding` fires: time to say what's next. */
export const POSE_ENDING_LEAD_SECONDS = 3;

/**
 * The pose clock for a guided yoga session.
 *
 * Each pose counts down against the wall clock (so a backgrounded tab does not
 * drift), then the next begins on its own. Pausing keeps the time left in the
 * pose; resuming carries on from there. A frozen app pauses the same way,
 * rather than running through poses nobody saw (see `watchForFreeze`).
 */
export function useYogaSession(
  poses: YogaPose[],
  {
    onPoseStart,
    onPoseEnding,
    onFinish,
    onFrozen,
  }: {
    /** Called as each pose begins — the player strikes its bell here. */
    onPoseStart?: (index: number) => void;
    /** Called once per pose, a few seconds before it ends. */
    onPoseEnding?: (index: number) => void;
    onFinish?: () => void;
    /** Called when the clock pauses itself because the app was frozen. */
    onFrozen?: () => void;
  } = {},
) {
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState(poses[0]?.seconds ?? 0);
  const [running, setRunning] = React.useState(false);
  // Bumped whenever a pose starts, so the clock re-arms even while running.
  const [armed, setArmed] = React.useState(0);

  const indexRef = React.useRef(0);
  const remainingRef = React.useRef(poses[0]?.seconds ?? 0);
  // The pose whose ending has already been announced, so it fires only once.
  const endingFiredRef = React.useRef(-1);
  const handlers = React.useRef({ onPoseStart, onPoseEnding, onFinish, onFrozen });
  handlers.current = { onPoseStart, onPoseEnding, onFinish, onFrozen };

  /** Starts pose `next`, from its top or with only `remainingOverride` left. */
  const goTo = React.useCallback(
    (next: number, remainingOverride?: number) => {
      if (next >= poses.length) {
        setRunning(false);
        handlers.current.onFinish?.();
        return;
      }
      if (next === 0) endingFiredRef.current = -1;
      const left = Math.min(remainingOverride ?? poses[next].seconds, poses[next].seconds);
      indexRef.current = next;
      remainingRef.current = left;
      setIndex(next);
      setRemaining(left);
      setRunning(true);
      setArmed((value) => value + 1);
      handlers.current.onPoseStart?.(next);
    },
    [poses],
  );

  React.useEffect(() => {
    if (!running) return undefined;

    const deadline = Date.now() + remainingRef.current * 1000;
    const watch = watchForFreeze(() => audioEngine.soundClock);

    const id = window.setInterval(() => {
      const now = Date.now();
      if (watch.frozen(now)) {
        setRunning(false);
        handlers.current.onFrozen?.();
        return;
      }

      const left = Math.max(0, (deadline - now) / 1000);
      remainingRef.current = left;
      setRemaining(left);
      if (left <= POSE_ENDING_LEAD_SECONDS && left > 0 && endingFiredRef.current !== indexRef.current) {
        endingFiredRef.current = indexRef.current;
        handlers.current.onPoseEnding?.(indexRef.current);
      }
      if (left <= 0) {
        window.clearInterval(id);
        goTo(indexRef.current + 1);
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [running, armed, goTo]);

  const begin = React.useCallback(() => goTo(0), [goTo]);
  /** Picks a session up part-way through a pose, as it was left. */
  const beginAt = React.useCallback(
    (index: number, remainingSeconds: number) => {
      endingFiredRef.current = -1;
      goTo(index, remainingSeconds);
    },
    [goTo],
  );
  const skip = React.useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const pause = React.useCallback(() => setRunning(false), []);
  const resume = React.useCallback(() => setRunning(true), []);

  return { index, remaining, running, begin, beginAt, skip, pause, resume, stop: pause };
}
