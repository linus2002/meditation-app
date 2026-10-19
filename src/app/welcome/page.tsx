'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  WelcomeFeatures,
  WelcomeIntent,
  WelcomeIntro,
  WelcomeLibrary,
} from '@/components/onboarding/welcome-steps';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

const STEP_COUNT = 4;

/**
 * The first-run tour: four steps, shown once — the mark, the library, what's
 * new, and the original intro screen that ends on Get Started.
 *
 * The steps sit side by side in one horizontally scrolling strip that snaps a
 * step at a time, so they can be swiped left and right as well as moved on with
 * each step's own button. Touch and trackpads scroll it natively; a mouse can
 * drag it too, since browsers never scroll on a mouse drag by themselves.
 * Whichever step is on screen is marked `data-active`, which is what plays its
 * text in (see `.reveal`).
 *
 * Finishing or skipping sets `onboarded`, which persists to localStorage — so
 * it appears on a fresh install and never again, on the web or inside the
 * native shell — and moves on to sign-in. `/` is the gate that decides whether
 * anyone is sent here.
 *
 * Pinned to the dark palette whatever the app preference is: the aurora and the
 * full-bleed photography behind these steps are dark artwork, and a light
 * treatment would leave the headlines sitting on top of them unreadable.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [step, setStep] = React.useState(0);

  const finish = React.useCallback(() => {
    completeOnboarding();
    router.replace('/login');
  }, [completeOnboarding, router]);

  const goTo = React.useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  }, []);

  /*
   * Whether the strip has come to rest. A frame whose width is not a whole
   * number of pixels can stop a fraction short of a step, leaving a hairline of
   * the neighbouring step along the edge; once the strip settles, every step
   * but the current one is hidden so that sliver never shows.
   */
  const [settled, setSettled] = React.useState(true);
  const settleTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // The step is read off the scroll position, so a swipe and a button press
  // land in the same place and the dots always agree with what is on screen.
  const onScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setStep(Math.round(track.scrollLeft / track.clientWidth));
    setSettled(false);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettled(true), 150);
  }, []);

  /*
   * Mouse dragging. The strip follows the pointer with snapping switched off,
   * then settles on the neighbouring step once the drag passes a threshold.
   * The pointer is only captured once it has actually moved, so a plain click
   * still reaches the buttons; a click that ends a drag is swallowed.
   */
  const drag = React.useRef<{ startX: number; startLeft: number; from: number; dragging: boolean } | null>(
    null,
  );
  const justDragged = React.useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !track) return;
    drag.current = {
      startX: event.clientX,
      startLeft: track.scrollLeft,
      from: Math.round(track.scrollLeft / track.clientWidth),
      dragging: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const state = drag.current;
    if (!track || !state) return;
    const dx = event.clientX - state.startX;
    if (!state.dragging) {
      if (Math.abs(dx) < 6) return;
      state.dragging = true;
      track.setPointerCapture(event.pointerId);
      track.style.scrollSnapType = 'none';
    }
    track.scrollLeft = state.startLeft - dx;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const state = drag.current;
    drag.current = null;
    if (!track || !state?.dragging) return;

    const dx = event.clientX - state.startX;
    const threshold = track.clientWidth * 0.15;
    const shift = dx < -threshold ? 1 : dx > threshold ? -1 : 0;
    goTo(Math.min(STEP_COUNT - 1, Math.max(0, state.from + shift)));

    justDragged.current = true;
    // Snapping comes back once the smooth scroll has landed on the step.
    window.setTimeout(() => {
      track.style.scrollSnapType = '';
      justDragged.current = false;
    }, 450);
  };

  const steps = [
    <WelcomeIntro key="intro" onNext={() => goTo(1)} onSkip={finish} />,
    <WelcomeLibrary key="library" onNext={() => goTo(2)} />,
    <WelcomeFeatures key="features" onNext={() => goTo(3)} />,
    <WelcomeIntent key="intent" onDone={finish} />,
  ];

  return (
    <div data-theme="dark" className="relative flex min-h-0 flex-1 flex-col bg-canvas">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(event) => {
          if (justDragged.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        // Stops the browser dragging a photo out instead of moving the strip.
        onDragStart={(event) => event.preventDefault()}
        className="rail flex min-h-0 flex-1 cursor-grab snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain select-none active:cursor-grabbing"
      >
        {steps.map((content, index) => (
          <section
            key={index}
            aria-roledescription="slide"
            aria-label={`Step ${index + 1} of ${STEP_COUNT}`}
            aria-hidden={index !== step}
            data-active={index === step}
            className={cn(
              'rail relative h-full w-full shrink-0 snap-start snap-always overflow-y-auto',
              settled && index !== step && 'invisible',
            )}
          >
            {content}
          </section>
        ))}
      </div>

      {/* Where you are in the tour; each dot also jumps straight to its step. */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+14px)] z-10 flex justify-center gap-1.5">
        {steps.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Go to step ${index + 1}`}
            aria-current={index === step ? 'step' : undefined}
            className={cn(
              'pointer-events-auto h-1.5 rounded-full transition-all duration-300',
              index === step ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70',
            )}
          />
        ))}
      </div>
    </div>
  );
}
