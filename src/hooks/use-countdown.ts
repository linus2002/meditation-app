'use client';

import * as React from 'react';

import { audioEngine } from '@/lib/audio/engine';
import { watchForFreeze } from '@/lib/audio/freeze';

interface UseCountdownOptions {
  /** Total length of the countdown. */
  seconds: number;
  onComplete?: () => void;
}

export interface CountdownState {
  /** Seconds left, as a float — the ring reads this. */
  remaining: number;
  running: boolean;
  /** 0-1 through the countdown. */
  progress: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (seconds?: number) => void;
}

/**
 * A countdown measured against the wall clock rather than by counting ticks,
 * so a throttled or backgrounded tab does not fall behind.
 *
 * It ticks four times a second: fast enough for the ring to move smoothly with
 * a short CSS transition between updates, slow enough to stay off the main
 * thread's back. A frozen app pauses at the last time it was seen running,
 * rather than finishing a sit nobody heard (see `watchForFreeze`).
 */
export function useCountdown({ seconds, onComplete }: UseCountdownOptions): CountdownState {
  const [remaining, setRemaining] = React.useState(seconds);
  const [running, setRunning] = React.useState(false);

  const deadlineRef = React.useRef(0);
  const totalRef = React.useRef(seconds);
  const completeRef = React.useRef(onComplete);

  React.useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  // A new length while idle re-arms the countdown. Keyed on the length alone:
  // keyed on `running` as well, every pause re-armed it, so pausing a sit
  // threw away the time already sat and resuming started it over.
  const runningRef = React.useRef(running);
  runningRef.current = running;
  React.useEffect(() => {
    if (runningRef.current) return;
    totalRef.current = seconds;
    setRemaining(seconds);
  }, [seconds]);

  React.useEffect(() => {
    if (!running) return undefined;

    deadlineRef.current = Date.now() + remaining * 1000;
    const watch = watchForFreeze(() => audioEngine.soundClock);

    const id = window.setInterval(() => {
      const now = Date.now();
      if (watch.frozen(now)) {
        setRunning(false);
        return;
      }

      const left = (deadlineRef.current - now) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        completeRef.current?.();
        return;
      }
      setRemaining(left);
    }, 250);

    return () => window.clearInterval(id);
    // `remaining` is read once when the run starts, not tracked here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const start = React.useCallback(() => {
    setRemaining(totalRef.current);
    setRunning(true);
  }, []);

  const pause = React.useCallback(() => setRunning(false), []);
  const resume = React.useCallback(() => setRunning(true), []);

  const reset = React.useCallback((next?: number) => {
    setRunning(false);
    if (typeof next === 'number') totalRef.current = next;
    setRemaining(totalRef.current);
  }, []);

  const total = totalRef.current;

  return {
    remaining,
    running,
    progress: total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0,
    start,
    pause,
    resume,
    reset,
  };
}
