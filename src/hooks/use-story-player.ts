'use client';

import * as React from 'react';

import { useNarration } from '@/hooks/use-narration';
import { estimatedSeconds, segmentAfterSeconds, segmentStory, totalLength } from '@/lib/story';
import type { Story, StoryNarration } from '@/types';

/**
 * What the story screen needs from a reader, whether that is a recording or
 * the device's own voice. The two keep position differently (seconds against
 * sentences), so the seek bar is described here rather than assumed.
 */
export interface StoryPlayer {
  /** False only when there is neither a recording nor speech synthesis. */
  supported: boolean;
  /** Started and not yet stopped or finished; true while paused too. */
  speaking: boolean;
  paused: boolean;
  elapsed: number;
  total: number;
  /** True for a recording; the device voice's clocks are estimates. */
  exact: boolean;
  /** The paragraph being read, or -1 before it starts. */
  activeParagraph: number;
  seek: { value: number; max: number; label: string };
  seekTo: (value: number) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: (seconds: number) => void;
}

/** Shown on the lock screen and in the notification shade while it plays. */
interface NowPlaying {
  title: string;
  artist: string;
  artwork?: string;
}

/**
 * Plays a recorded narration through a plain audio element, so the phone's
 * own volume buttons and lock-screen controls work as they do for any audio.
 */
function useRecording(recording: StoryNarration | undefined, nowPlaying: NowPlaying) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  const src = recording?.src;

  React.useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = src;
    audioRef.current = audio;
    setFailed(false);

    const onTime = () => setElapsed(audio.currentTime);
    const onPlay = () => {
      setSpeaking(true);
      setPaused(false);
    };
    const onPause = () => {
      if (!audio.ended) setPaused(true);
    };
    const onEnded = () => {
      setSpeaking(false);
      setPaused(false);
      setElapsed(0);
      audio.currentTime = 0;
    };
    const onError = () => setFailed(true);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      // The reading must never outlive the screen.
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [src]);

  const play = React.useCallback(() => {
    void audioRef.current?.play().catch(() => setPaused(true));
  }, []);
  const pause = React.useCallback(() => audioRef.current?.pause(), []);
  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setSpeaking(false);
    setPaused(false);
    setElapsed(0);
  }, []);
  const seekTo = React.useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const end = recording?.duration ?? audio.duration;
    audio.currentTime = Math.min(Math.max(0, seconds), Math.max(0, end - 0.5));
    setElapsed(audio.currentTime);
  }, [recording?.duration]);
  const skip = React.useCallback(
    (seconds: number) => seekTo((audioRef.current?.currentTime ?? 0) + seconds),
    [seekTo],
  );

  // Lock-screen and headphone controls, where the platform offers them.
  const { title, artist, artwork } = nowPlaying;
  React.useEffect(() => {
    if (!speaking || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return undefined;
    }
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title,
      artist,
      ...(artwork ? { artwork: [{ src: artwork }] } : {}),
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['seekbackward', () => skip(-15)],
      ['seekforward', () => skip(15)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every browser knows every action.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // As above.
        }
      }
    };
  }, [speaking, title, artist, artwork, play, pause, skip]);

  return { speaking, paused, elapsed, failed, play, pause, stop, seekTo, skip };
}

/**
 * The story's reader: its recording where it has one, and the device's own
 * voice otherwise — including when the recording cannot be reached, such as
 * offline, so a story can always be heard.
 */
export function useStoryPlayer(story: Story): StoryPlayer {
  const segments = React.useMemo(() => segmentStory(story), [story]);
  const narration = useNarration(segments);
  const recording = useRecording(story.narration, {
    title: story.title,
    artist: `Read by ${story.voice}`,
    artwork: (story.cover ?? story.image).src,
  });

  if (story.narration && !recording.failed) {
    const { paragraphStarts, duration } = story.narration;
    const elapsed = recording.elapsed;
    let activeParagraph = -1;
    paragraphStarts.forEach((start, index) => {
      if (elapsed >= start) activeParagraph = index;
    });
    return {
      supported: true,
      speaking: recording.speaking,
      paused: recording.paused,
      elapsed,
      total: duration,
      exact: true,
      activeParagraph,
      seek: { value: Math.round(elapsed), max: Math.floor(duration), label: 'seconds' },
      seekTo: recording.seekTo,
      play: recording.play,
      pause: recording.pause,
      resume: recording.play,
      stop: recording.stop,
      skip: recording.skip,
    };
  }

  const total = estimatedSeconds(story, narration.rate);
  const current = segments[narration.index];
  const progress = current ? Math.min(1, current.offset / totalLength(segments)) : 0;
  return {
    supported: narration.supported,
    speaking: narration.speaking,
    paused: narration.paused,
    elapsed: Math.round(progress * total),
    total,
    exact: false,
    activeParagraph: current?.paragraph ?? -1,
    seek: { value: narration.index, max: Math.max(0, segments.length - 1), label: 'sentence' },
    seekTo: narration.seekTo,
    play: () => narration.play(),
    pause: narration.pause,
    resume: narration.resume,
    stop: narration.stop,
    skip: (seconds) =>
      narration.seekTo(segmentAfterSeconds(segments, narration.index, seconds, narration.rate)),
  };
}
