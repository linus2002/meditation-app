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
 * record work exactly as they do for a session without a recording. But it
 * must not run on while nothing can be heard:
 * - while the recording loads (`onStallChange(true)`), the clock holds;
 * - if it cannot load at all (`onFailed`), the session pauses, and the next
 *   press of play tries again;
 * - played or paused from outside the app (lock screen, headphones), the
 *   session follows (`onExternalPlay`, `onInterrupted`).
 */
export function useSessionTrack(
  src: string | undefined,
  {
    isPlaying,
    elapsed,
    onInterrupted,
    onExternalPlay,
    onStallChange,
    onFailed,
  }: {
    isPlaying: boolean;
    elapsed: number;
    /** The recording stopped without being asked to: a call, another app, an unplugged headset. */
    onInterrupted?: () => void;
    /** The recording started without the app asking: the lock screen or a headset button. */
    onExternalPlay?: () => void;
    /** True while it is meant to be playing but has nothing to play yet. */
    onStallChange?: (stalled: boolean) => void;
    /** It could not be loaded or played. */
    onFailed?: () => void;
  },
) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const elapsedRef = React.useRef(elapsed);
  elapsedRef.current = elapsed;
  const playingRef = React.useRef(isPlaying);
  playingRef.current = isPlaying;
  const handlers = React.useRef({ onInterrupted, onExternalPlay, onStallChange, onFailed });
  handlers.current = { onInterrupted, onExternalPlay, onStallChange, onFailed };

  const stalledRef = React.useRef(false);
  const setStalled = React.useCallback((stalled: boolean) => {
    if (stalledRef.current === stalled) return;
    stalledRef.current = stalled;
    handlers.current.onStallChange?.(stalled);
  }, []);

  /** Plays, and reports a refusal or a failure rather than running on in silence. */
  const playAudio = React.useCallback(
    (audio: HTMLAudioElement) => {
      // A failed element stays failed: load it again to retry.
      if (audio.error) audio.load();
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setStalled(true);
      void audio.play().catch((error: unknown) => {
        // Interrupted by our own pause or a seek: not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStalled(false);
        handlers.current.onFailed?.();
      });
    },
    [setStalled],
  );

  React.useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = src;
    audioRef.current = audio;

    const onPause = () => {
      setStalled(false);
      // Our own pauses happen after the transport has stopped; any other is
      // the system taking the sound away, so the session holds its place.
      if (playingRef.current && !audio.ended) handlers.current.onInterrupted?.();
    };
    const onPlay = () => {
      if (!playingRef.current) handlers.current.onExternalPlay?.();
    };
    const onWaiting = () => {
      if (playingRef.current) setStalled(true);
    };
    const onPlaying = () => setStalled(false);
    const onError = () => {
      setStalled(false);
      // Only matters while it is meant to be heard; a failed preload retries on play.
      if (playingRef.current) handlers.current.onFailed?.();
    };

    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);

    return () => {
      // The recording must never outlive the screen.
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
      setStalled(false);
    };
  }, [src, setStalled]);

  /**
   * Starts the recording from inside a tap. iOS and installed PWAs only let
   * audio begin in the gesture itself, so this runs synchronously from it.
   */
  const start = React.useCallback(
    (from?: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = from ?? elapsedRef.current;
      playAudio(audio);
    },
    [playAudio],
  );

  // Follow the transport.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      if (Math.abs(audio.currentTime - elapsedRef.current) > DRIFT_SECONDS) {
        audio.currentTime = elapsedRef.current;
      }
      if (audio.paused) playAudio(audio);
    } else {
      setStalled(false);
      if (!audio.paused) audio.pause();
    }
  }, [isPlaying, src, playAudio, setStalled]);

  // Follow the clock when it jumps. The clock holds while the recording loads,
  // so the two only part when the clock is moved on purpose.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Read before seeking: moving the playhead clears `ended`.
    const finished = audio.ended;
    if (!stalledRef.current && Math.abs(audio.currentTime - elapsed) > DRIFT_SECONDS) {
      audio.currentTime = elapsed;
    }
    // Looping: the clock went round again after the recording reached its end.
    if (playingRef.current && finished) playAudio(audio);
  }, [elapsed, playAudio]);

  return { start };
}
