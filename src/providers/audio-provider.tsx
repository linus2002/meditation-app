'use client';

import * as React from 'react';

import { audioEngine } from '@/lib/audio/engine';
import type { SoundscapeId } from '@/lib/audio/soundscapes';

const VOLUME_KEY = 'serenity.audio.v1';

interface AudioContextValue {
  supported: boolean;
  /** The scape currently sounding, or null when nothing is playing. */
  playing: SoundscapeId | null;
  volume: number;
  muted: boolean;
  setVolume: (value: number) => void;
  toggleMuted: () => void;
  /** Starts (or crossfades to) a soundscape. Resolves once audio is running. */
  play: (id: SoundscapeId) => Promise<void>;
  /**
   * Unlocks the audio context from a user gesture without starting a bed —
   * needed when the only sounds are one-shots, like the timer's bells.
   */
  prime: () => Promise<void>;
  stop: (fadeSeconds?: number) => void;
  fadeOut: (seconds: number) => void;
  /** A struck bell. The timer uses distinct pitches for start, interval and end. */
  bell: (frequency?: number) => void;
  breathCue: (direction: 'in' | 'out') => void;
}

const AudioCtx = React.createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = React.useState<SoundscapeId | null>(null);
  const [volume, setVolumeState] = React.useState(0.7);
  const [muted, setMuted] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  // Read by `prime`, which must stay stable across volume changes.
  const volumeRef = React.useRef(0.7);

  React.useEffect(() => {
    setSupported(audioEngine.isSupported);
    try {
      const raw = window.localStorage.getItem(VOLUME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { volume?: number; muted?: boolean };
        if (typeof parsed.volume === 'number') {
          volumeRef.current = parsed.volume;
          setVolumeState(parsed.volume);
          audioEngine.setVolume(parsed.volume);
        }
        if (typeof parsed.muted === 'boolean') {
          setMuted(parsed.muted);
          audioEngine.setMuted(parsed.muted);
        }
      }
    } catch {
      // Storage unavailable — the defaults are fine.
    }
  }, []);

  // Audio must never outlive the page.
  React.useEffect(() => () => audioEngine.stop(0.2), []);

  const persist = React.useCallback((next: { volume: number; muted: boolean }) => {
    try {
      window.localStorage.setItem(VOLUME_KEY, JSON.stringify(next));
    } catch {
      // Non-critical.
    }
  }, []);

  const setVolume = React.useCallback(
    (value: number) => {
      volumeRef.current = value;
      setVolumeState(value);
      audioEngine.setVolume(value);
      persist({ volume: value, muted });
    },
    [muted, persist],
  );

  const toggleMuted = React.useCallback(() => {
    setMuted((current) => {
      const next = !current;
      audioEngine.setMuted(next);
      persist({ volume, muted: next });
      return next;
    });
  }, [volume, persist]);

  const play = React.useCallback(
    async (id: SoundscapeId) => {
      const running = await audioEngine.resume();
      if (!running) return;
      // Re-assert the level in case a previous fade-out left the master down.
      audioEngine.setVolume(volume);
      audioEngine.play(id);
      setPlaying(id);
    },
    [volume],
  );

  const stop = React.useCallback((fadeSeconds?: number) => {
    audioEngine.stop(fadeSeconds);
    setPlaying(null);
  }, []);

  const prime = React.useCallback(async () => {
    await audioEngine.resume();
    audioEngine.setVolume(volumeRef.current);
  }, []);

  const fadeOut = React.useCallback((seconds: number) => audioEngine.fadeOut(seconds), []);
  const bell = React.useCallback((frequency?: number) => audioEngine.bell(frequency), []);
  const breathCue = React.useCallback(
    (direction: 'in' | 'out') => audioEngine.breathCue(direction),
    [],
  );

  const value = React.useMemo<AudioContextValue>(
    () => ({
      supported,
      playing,
      volume,
      muted,
      setVolume,
      toggleMuted,
      play,
      prime,
      stop,
      fadeOut,
      bell,
      breathCue,
    }),
    [
      supported,
      playing,
      volume,
      muted,
      setVolume,
      toggleMuted,
      play,
      prime,
      stop,
      fadeOut,
      bell,
      breathCue,
    ],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextValue {
  const context = React.useContext(AudioCtx);
  if (!context) {
    throw new Error('useAudio must be used inside <AudioProvider>');
  }
  return context;
}
