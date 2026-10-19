'use client';

import * as React from 'react';

interface UndoOffer {
  /** What just happened, e.g. "Reflection deleted". */
  message: string;
  /** Puts things back. */
  undo: () => void;
  /**
   * For removals that cannot be reversed once done (an offline copy, say):
   * the caller hides the item straight away and the real removal runs here,
   * once the chance to undo has passed.
   */
  commit?: () => void;
}

type OfferUndo = (offer: UndoOffer) => void;

const UndoContext = React.createContext<OfferUndo | null>(null);

/** Long enough to notice and reach for, even on a tired day. */
const VISIBLE_MS = 8000;

/**
 * One "Deleted · Undo" bar for the whole app. Rendered from the root layout so
 * it outlives the screen that raised it: delete something, go back, and Undo
 * is still there. Starting a second removal settles the first.
 */
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<(UndoOffer & { key: number }) | null>(null);
  const pendingRef = React.useRef<UndoOffer | null>(null);
  const timerRef = React.useRef<number | undefined>(undefined);
  const heldRef = React.useRef(false);

  const settle = React.useCallback(() => {
    window.clearTimeout(timerRef.current);
    pendingRef.current?.commit?.();
    pendingRef.current = null;
    setCurrent(null);
  }, []);

  const startTimer = React.useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!heldRef.current) settle();
    }, VISIBLE_MS);
  }, [settle]);

  const offerUndo = React.useCallback<OfferUndo>(
    (offer) => {
      settle();
      pendingRef.current = offer;
      heldRef.current = false;
      setCurrent({ ...offer, key: Date.now() });
      startTimer();
    },
    [settle, startTimer],
  );

  const undo = () => {
    window.clearTimeout(timerRef.current);
    pendingRef.current?.undo();
    pendingRef.current = null;
    setCurrent(null);
  };

  // A removal still waiting when the app closes goes ahead, as it would have.
  React.useEffect(() => {
    window.addEventListener('pagehide', settle);
    return () => {
      window.removeEventListener('pagehide', settle);
      window.clearTimeout(timerRef.current);
    };
  }, [settle]);

  // Paused while the reader is touching, pointing at or focused on the bar.
  const hold = () => {
    heldRef.current = true;
    window.clearTimeout(timerRef.current);
  };
  const release = () => {
    heldRef.current = false;
    if (pendingRef.current) startTimer();
  };

  return (
    <UndoContext.Provider value={offerUndo}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-50 flex justify-center px-4"
      >
        {current ? (
          <div
            key={current.key}
            onPointerEnter={hold}
            onPointerLeave={release}
            onFocus={hold}
            onBlur={release}
            className="pointer-events-auto flex w-full max-w-[398px] items-center justify-between gap-3 rounded-2xl bg-ink py-1.5 pl-4 pr-1.5 text-canvas shadow-pill"
          >
            <p className="text-body-sm font-medium">{current.message}</p>
            <button
              type="button"
              onClick={undo}
              className="h-11 shrink-0 rounded-xl px-4 text-body-sm font-semibold text-canvas underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas/70"
            >
              Undo
            </button>
          </div>
        ) : null}
      </div>
    </UndoContext.Provider>
  );
}

/** Offers an Undo for something just removed. */
export function useUndo(): OfferUndo {
  const offer = React.useContext(UndoContext);
  if (!offer) throw new Error('useUndo must be used inside UndoProvider');
  return offer;
}
