'use client';

import * as React from 'react';

/** How far the recording may wander from the session clock before it is pulled back. */
const DRIFT_SECONDS = 1.5;

/**
 * Plays a session's recorded track through a plain audio element, following
 * the session clock: it plays and pauses with the transport, and jumps when
 * the clock does (a seek, a skip, a loop, "Sit again").
 *
 * The clock stays in charge so the scrubber, resume points and the session
 * record work exactly as they do for a session without a recording.
 */
export function useSessionTrack(
  src: string | undefined,
  {
    isPlaying,
    elapsed,
    onInterrupted,
  }: {
    isPlaying: boolean;
    elapsed: number;
    /** The recording stopped without being asked to: a call, another app, an unplugged headset. */
    onInterrupted?: () => void;
  },
) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const elapsedRef = React.useRef(elapsed);
  elapsedRef.current = elapsed;
  const playingRef = React.useRef(isPlaying);
  playingRef.current = isPlaying;
  const interruptedRef = React.useRef(onInterrupted);
  interruptedRef.current = onInterrupted;

  React.useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = src;
    audioRef.current = audio;

    const onPause = () => {
      // Our own pauses happen after the transport has stopped; any other is
      // the system taking the sound away, so the session holds its place.
      if (playingRef.current && !audio.ended) interruptedRef.current?.();
    };
    audio.addEventListener('pause', onPause);

    return () => {
      // The recording must never outlive the screen.
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [src]);

  /**
   * Starts the recording from inside a tap. iOS and installed PWAs only let
   * audio begin in the gesture itself, so this runs synchronously from it.
   */
  const start = React.useCallback((from?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = from ?? elapsedRef.current;
    void audio.play().catch(() => undefined);
  }, []);

  // Follow the transport.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      if (Math.abs(audio.currentTime - elapsedRef.current) > DRIFT_SECONDS) {
        audio.currentTime = elapsedRef.current;
      }
      if (audio.paused) void audio.play().catch(() => undefined);
    } else if (!audio.paused) {
      audio.pause();
    }
  }, [isPlaying, src]);

  // Follow the clock when it jumps. Skipped while the file is still buffering,
  // so a slow connection is not made to seek over and over.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Read before seeking: moving the playhead clears `ended`.
    const finished = audio.ended;
    const buffering = !audio.paused && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
    if (!buffering && Math.abs(audio.currentTime - elapsed) > DRIFT_SECONDS) {
      audio.currentTime = elapsed;
    }
    // Looping: the clock went round again after the recording reached its end.
    if (playingRef.current && finished) void audio.play().catch(() => undefined);
  }, [elapsed]);

  return { start };
}
