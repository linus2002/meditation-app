'use client';

import * as React from 'react';

import { clamp } from '@/lib/format';

interface UsePlayerOptions {
  durationSeconds: number;
  /** Fires once the elapsed time reaches the full duration. */
  onComplete?: () => void;
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
 */
export function usePlayer({ durationSeconds, onComplete }: UsePlayerOptions): PlayerState {
  const [elapsed, setElapsed] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const startedAtRef = React.useRef(0);
  const baseElapsedRef = React.useRef(0);
  const completeRef = React.useRef(onComplete);

  React.useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    if (!isPlaying) return undefined;

    startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const seconds = baseElapsedRef.current + (Date.now() - startedAtRef.current) / 1000;
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

  const skip = React.useCallback((delta: number) => seek(baseElapsedRef.current + delta), [seek]);

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
