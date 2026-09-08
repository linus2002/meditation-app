'use client';

import * as React from 'react';

import type { StorySegment } from '@/lib/story';

export interface NarrationState {
  /** False where the browser has no speech synthesis at all. */
  supported: boolean;
  /** True once at least one voice is available to speak with. */
  ready: boolean;
  speaking: boolean;
  paused: boolean;
  /** Index of the sentence currently being read. */
  index: number;
  volume: number;
  rate: number;
  setVolume: (value: number) => void;
  setRate: (value: number) => void;
  play: (fromIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (index: number) => void;
}

/** Prefers a calm, local, English voice where the device offers a choice. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const pool = english.length > 0 ? english : voices;
  const preferred = ['samantha', 'serena', 'daniel', 'google uk english female', 'natural'];

  for (const name of preferred) {
    const match = pool.find((voice) => voice.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return pool.find((voice) => voice.localService) ?? pool[0];
}

/**
 * Reads a story aloud through the Web Speech API.
 *
 * Sentences are spoken one at a time and chained on `onend`, which is what
 * gives the player a real position: seeking is just choosing a different
 * sentence to start from. `speechSynthesis.cancel()` also fires `onend`, so
 * every stop sets a guard first to stop the chain advancing.
 *
 * Rate and volume apply from the next sentence onward — an utterance already
 * being spoken cannot be changed in flight.
 */
export function useNarration(segments: StorySegment[]): NarrationState {
  const [supported, setSupported] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [rate, setRate] = React.useState(0.9);

  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const stoppedRef = React.useRef(true);
  const segmentsRef = React.useRef(segments);
  segmentsRef.current = segments;
  const volumeRef = React.useRef(volume);
  const rateRef = React.useRef(rate);

  React.useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  React.useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  // Voices arrive asynchronously on most browsers, and can be empty at first.
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    setSupported(true);

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      voiceRef.current = pickVoice(voices);
      setReady(true);
    };

    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speakFrom = React.useCallback((start: number) => {
    const list = segmentsRef.current;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (start >= list.length) {
      setSpeaking(false);
      setPaused(false);
      stoppedRef.current = true;
      return;
    }

    stoppedRef.current = false;
    setIndex(start);
    setSpeaking(true);
    setPaused(false);

    const utterance = new SpeechSynthesisUtterance(list[start].text);
    // A rejected voice must not take the whole narration down with it; the
    // browser's default voice is a perfectly good fallback.
    try {
      if (voiceRef.current) utterance.voice = voiceRef.current;
    } catch {
      voiceRef.current = null;
    }
    utterance.rate = rateRef.current;
    utterance.volume = volumeRef.current;
    utterance.pitch = 1;

    utterance.onend = () => {
      // `cancel()` also lands here; the guard keeps it from advancing.
      if (stoppedRef.current) return;
      speakFrom(start + 1);
    };
    utterance.onerror = () => {
      if (stoppedRef.current) return;
      stoppedRef.current = true;
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = React.useCallback(() => {
    stoppedRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setPaused(false);
  }, []);

  const play = React.useCallback(
    (fromIndex?: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      stoppedRef.current = true;
      window.speechSynthesis.cancel();
      // Chrome needs a beat after cancel() before the next speak() takes.
      window.setTimeout(() => speakFrom(fromIndex ?? index), 60);
    },
    [speakFrom, index],
  );

  const pause = React.useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = React.useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  /** Seeking restarts at the chosen sentence, and keeps playing if it was. */
  const seekTo = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), Math.max(0, segmentsRef.current.length - 1));
      setIndex(clamped);
      if (speaking) play(clamped);
    },
    [speaking, play],
  );

  // Narration must never outlive the screen.
  React.useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supported,
    ready,
    speaking,
    paused,
    index,
    volume,
    rate,
    setVolume,
    setRate,
    play,
    pause,
    resume,
    stop,
    seekTo,
  };
}
