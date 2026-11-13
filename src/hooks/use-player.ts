'use client';

import * as React from 'react';

import { audioEngine } from '@/lib/audio/engine';
import { watchForFreeze } from '@/lib/audio/freeze';
import { clamp } from '@/lib/format';

interface UsePlayerOptions {
  durationSeconds: number;
  /** Fires once the elapsed time reaches the full duration. */
  onComplete?: () => void;
  /** On reaching the end, start again from 0 instead of stopping. */
  loop?: boolean;
  /** Fires each time a loop goes round, in place of `onComplete`. */
  onLoop?: () => void;
}

export interface PlayerState {
  elapsed: number;
  isPlaying: boolean;
  progress: number;
  remaining: number;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  restart: () => void;
}

/**
 * Drives the session clock. There is no audio file behind the mock catalogue,
 * so playback is simulated with a wall-clock timer that survives tab throttling
 * by measuring elapsed time rather than counting ticks.
 *
 * A frozen app pauses where the sound stopped, rather than finishing a session
 * nobody heard (see `watchForFreeze`).
 */
export function usePlayer({
  durationSeconds,
  onComplete,
  loop = false,
  onLoop,
}: UsePlayerOptions): PlayerState {
  const [elapsed, setElapsed] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const startedAtRef = React.useRef(0);
  const baseElapsedRef = React.useRef(0);
  const completeRef = React.useRef(onComplete);
  const loopRef = React.useRef({ loop, onLoop });

  React.useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);
  React.useEffect(() => {
    loopRef.current = { loop, onLoop };
  }, [loop, onLoop]);

  React.useEffect(() => {
    if (!isPlaying) return undefined;

    startedAtRef.current = Date.now();
    const watch = watchForFreeze(() => audioEngine.soundClock);

    const id = window.setInterval(() => {
      const now = Date.now();
      if (watch.frozen(now)) {
        const kept = baseElapsedRef.current + Math.max(0, watch.lastTick - startedAtRef.current) / 1000;
        baseElapsedRef.current = kept;
        setElapsed(kept);
        setIsPlaying(false);
        return;
      }

      const seconds = baseElapsedRef.current + (now - startedAtRef.current) / 1000;
      if (seconds >= durationSeconds && loopRef.current.loop) {
        // Round again without stopping: the clock restarts from the top.
        baseElapsedRef.current = 0;
        startedAtRef.current = now;
        setElapsed(0);
        loopRef.current.onLoop?.();
        return;
      }
      if (seconds >= durationSeconds) {
        baseElapsedRef.current = durationSeconds;
        setElapsed(durationSeconds);
        setIsPlaying(false);
        completeRef.current?.();
        return;
      }
      setElapsed(seconds);
    }, 250);

    return () => window.clearInterval(id);
  }, [isPlaying, durationSeconds]);

  const play = React.useCallback(() => {
    baseElapsedRef.current = elapsed >= durationSeconds ? 0 : elapsed;
    if (elapsed >= durationSeconds) setElapsed(0);
    setIsPlaying(true);
  }, [elapsed, durationSeconds]);

  const pause = React.useCallback(() => {
    baseElapsedRef.current = elapsed;
    setIsPlaying(false);
  }, [elapsed]);

  const toggle = React.useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = React.useCallback(
    (seconds: number) => {
      const next = clamp(seconds, 0, durationSeconds);
      baseElapsedRef.current = next;
      startedAtRef.current = Date.now();
      setElapsed(next);
    },
    [durationSeconds],
  );

  const skip = React.useCallback((delta: number) => seek(elapsed + delta), [elapsed, seek]);

  const restart = React.useCallback(() => seek(0), [seek]);

  return {
    elapsed,
    isPlaying,
    progress: durationSeconds > 0 ? clamp(elapsed / durationSeconds, 0, 1) : 0,
    remaining: Math.max(0, durationSeconds - elapsed),
    toggle,
    play,
    pause,
    seek,
    skip,
    restart,
  };
}
