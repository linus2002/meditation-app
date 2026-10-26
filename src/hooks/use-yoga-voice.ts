'use client';

import * as React from 'react';

/** One thing for the instructor to say: its recording, and the words for when that fails. */
export interface SpokenLine {
  src?: string;
  text: string;
}

/**
 * The yoga instructor's voice.
 *
 * Lines are played in order through a single audio element. One element,
 * because a WebView only lets audio start without a tap on an element that
 * has already played from one, and the first line is said inside the tap that
 * starts the session. Saying something new cuts off whatever is still being
 * said, so the voice is never behind the clock.
 *
 * A line with no recording, or one that cannot be fetched (offline, say), is
 * spoken by the device's own voice instead, so the guidance never goes quiet.
 */
export function useYogaVoice() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const queueRef = React.useRef<SpokenLine[]>([]);
  // Bumped on every `say` and `stop`. Interrupting a line makes its pending
  // play() reject, and that must not be taken for a failed recording.
  const turnRef = React.useRef(0);

  const playNext = React.useCallback((turn: number) => {
    if (turn !== turnRef.current) return;
    const line = queueRef.current.shift();
    const audio = audioRef.current;
    if (!line || !audio) return;

    const advance = () => playNext(turn);
    const speakWithDevice = () => {
      if (turn !== turnRef.current) return;
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        advance();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.rate = 0.95;
      utterance.onend = advance;
      utterance.onerror = advance;
      window.speechSynthesis.speak(utterance);
    };

    if (!line.src) {
      speakWithDevice();
      return;
    }
    let settled = false;
    const fallBack = () => {
      if (settled) return;
      settled = true;
      speakWithDevice();
    };
    audio.onended = () => {
      settled = true;
      advance();
    };
    audio.onerror = fallBack;
    audio.src = line.src;
    void audio.play().catch(fallBack);
  }, []);

  const stop = React.useCallback(() => {
    turnRef.current += 1;
    queueRef.current = [];
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const say = React.useCallback(
    (...lines: SpokenLine[]) => {
      stop();
      audioRef.current ??= new Audio();
      queueRef.current = lines;
      playNext(turnRef.current);
    },
    [stop, playNext],
  );

  // Nothing is said once the screen is gone.
  React.useEffect(() => stop, [stop]);

  return { say, stop };
}
