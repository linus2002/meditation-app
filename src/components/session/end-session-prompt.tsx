'use client';

import * as React from 'react';

import { GradientButton } from '@/components/shared/gradient-button';
import { MIN_RECORDED_SECONDS } from '@/data/stats';

interface EndSessionPromptProps {
  open: boolean;
  /** Time sat so far, to say plainly what ending keeps. */
  secondsSoFar: number;
  onKeepGoing: () => void;
  onEnd: () => void;
}

/** "7 minutes" / "1 minute", or what happens to a sit too short to count. */
export function endSessionNote(seconds: number): string {
  if (seconds < MIN_RECORDED_SECONDS) {
    return 'Sits under a minute aren’t added to your progress.';
  }
  const minutes = Math.round(seconds / 60);
  return `The ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} you’ve sat will be saved.`;
}

/**
 * Asked before a session ends from its corner button, which is easy to hit by
 * accident on the way to something else. "Keep going" is the default and has
 * focus, so a stray tap or Enter never ends a sit. Escape keeps going too.
 */
export function EndSessionPrompt({ open, secondsSoFar, onKeepGoing, onEnd }: EndSessionPromptProps) {
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const returnFocusRef = React.useRef<Element | null>(null);
  // Players re-render on every tick; the focus effect must only run on open.
  const keepGoingRef = React.useRef(onKeepGoing);
  keepGoingRef.current = onKeepGoing;

  React.useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    keepRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') keepGoingRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onKeepGoing}
        className="absolute inset-0 bg-canvas-deep/70 backdrop-blur-[2px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="end-session-title"
        aria-describedby="end-session-note"
        className="relative w-full max-w-[430px] rounded-t-[24px] bg-surface px-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-6 shadow-pill"
      >
        <h2 id="end-session-title" className="text-[1.25rem] font-semibold leading-tight text-ink">
          End this session?
        </h2>
        <p id="end-session-note" className="mt-2 text-body-sm leading-relaxed text-ink-muted">
          {endSessionNote(secondsSoFar)}
        </p>

        <div className="mt-6 space-y-2">
          <GradientButton ref={keepRef} type="button" onClick={onKeepGoing} className="h-12 w-full">
            Keep going
          </GradientButton>
          <button
            type="button"
            onClick={onEnd}
            className="h-12 w-full rounded-full text-body-sm font-medium text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
