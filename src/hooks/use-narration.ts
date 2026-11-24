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
/**
 * `loop`: start again from the first sentence after the last one.
 * `onEnded`: called when the last sentence has been read (not when stopped).
 */
export function useNarration(
  segments: StorySegment[],
  loop = false,
  onEnded?: () => void,
): NarrationState {
  const [supported, setSupported] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [rate, setRate] = React.useState(0.9);

  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const stoppedRef = React.useRef(true);
  /** The reading queued to start after cancel(); only ever one. */
  const pendingRef = React.useRef<number | undefined>(undefined);
  const indexRef = React.useRef(0);
  indexRef.current = index;
  const segmentsRef = React.useRef(segments);
  segmentsRef.current = segments;
  const loopRef = React.useRef(loop);
  loopRef.current = loop;
  const endedRef = React.useRef(onEnded);
  endedRef.current = onEnded;
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
    if (start >= list.length && loopRef.current && list.length > 0) {
      speakFrom(0);
      return;
    }
    if (start >= list.length) {
      setSpeaking(false);
      setPaused(false);
      // Play again starts from the top, not from the last sentence.
      setIndex(0);
      stoppedRef.current = true;
      if (list.length > 0) endedRef.current?.();
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
    window.clearTimeout(pendingRef.current);
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
      // Chrome needs a beat after cancel() before the next speak() takes. Only
      // the latest request waits: quick seeks used to start several readings.
      window.clearTimeout(pendingRef.current);
      const from = fromIndex ?? indexRef.current;
      pendingRef.current = window.setTimeout(() => speakFrom(from), 60);
    },
    [speakFrom],
  );

  /*
   * Pause stops the voice, and Resume reads the sentence again from its start.
   * speechSynthesis.pause() acts as cancel() on Chrome for Android, where the
   * story then read on regardless.
   */
  const pause = React.useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.clearTimeout(pendingRef.current);
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setPaused(true);
  }, []);

  const resume = React.useCallback(() => {
    setPaused(false);
    play(indexRef.current);
  }, [play]);

  /** Seeking moves to the chosen sentence: read from there if playing, kept there if paused. */
  const seekTo = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), Math.max(0, segmentsRef.current.length - 1));
      setIndex(clamped);
      indexRef.current = clamped;
      if (speaking && !paused) play(clamped);
    },
    [speaking, paused, play],
  );

  // Narration must never outlive the screen.
  React.useEffect(() => {
    return () => {
      window.clearTimeout(pendingRef.current);
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
