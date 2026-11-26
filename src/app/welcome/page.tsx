'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  WelcomeFeatures,
  WelcomeIntent,
  WelcomeIntro,
  WelcomeLibrary,
} from '@/components/onboarding/welcome-steps';
import { dotAt, easeInOutCubic, glideMs, stepsInView } from '@/lib/slides';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

const STEP_COUNT = 4;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * The first-run tour: four steps, shown once — the mark, the library, what's
 * new, and the original intro screen that ends on Get Started.
 *
 * The steps sit side by side in one horizontally scrolling strip that snaps a
 * step at a time, so they can be swiped left and right as well as moved on with
 * each step's own button. Touch and trackpads scroll it natively; a mouse can
 * drag it too, since browsers never scroll on a mouse drag by themselves.
 *
 * Moving on by a button, a dot or a mouse drag glides the strip with an eased
 * motion of its own (lib/slides): the browser's own smooth scroll is quick and
 * abrupt on Android. A step's text rises in as soon as the step slides into
 * view, not at the halfway point, and stays once shown, so nothing vanishes
 * mid-slide. The dots follow the strip as it moves.
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
  const dotRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [step, setStep] = React.useState(0);

  const finish = React.useCallback(() => {
    completeOnboarding();
    router.replace('/login');
  }, [completeOnboarding, router]);

  /* The steps whose text has played in. A step joins as it comes into view and
     stays, so leaving one never blanks its text halfway through the slide. */
  const [seen, setSeen] = React.useState<readonly number[]>([0]);
  const seenRef = React.useRef(new Set<number>([0]));
  const markSeen = React.useCallback((indices: number[]) => {
    const fresh = indices.filter((index) => !seenRef.current.has(index));
    if (fresh.length === 0) return;
    for (const index of fresh) seenRef.current.add(index);
    setSeen([...seenRef.current]);
  }, []);

  /*
   * Whether the strip has come to rest. A frame whose width is not a whole
   * number of pixels can stop a fraction short of a step, leaving a hairline of
   * the neighbouring step along the edge; once the strip settles, every step
   * but the current one is hidden so that sliver never shows. Shown again the
   * moment a move begins, so the incoming step is never a frame late.
   */
  const [settled, setSettled] = React.useState(true);
  const settleTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(settleTimer.current), []);
  const unsettle = React.useCallback(() => {
    window.clearTimeout(settleTimer.current);
    setSettled(false);
  }, []);

  // The later steps' photos are hidden until their step moves in, so the
  // browser would decode them in the middle of the first glide and drop frames.
  // Decoding them now, while the first step is read, keeps that glide smooth.
  React.useEffect(() => {
    const images = trackRef.current?.querySelectorAll('img') ?? [];
    for (const image of images) {
      if (image.complete) void image.decode?.().catch(() => {});
      else image.addEventListener('load', () => void image.decode?.().catch(() => {}), { once: true });
    }
  }, []);

  // The glide in progress, if any.
  const glide = React.useRef<number | undefined>(undefined);
  const stopGlide = React.useCallback(() => {
    if (glide.current === undefined) return;
    cancelAnimationFrame(glide.current);
    glide.current = undefined;
    if (trackRef.current) trackRef.current.style.scrollSnapType = '';
  }, []);
  React.useEffect(() => stopGlide, [stopGlide]);

  const goTo = React.useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      stopGlide();
      const width = track.clientWidth;
      const from = track.scrollLeft;
      const to = index * width;
      if (width === 0 || Math.abs(to - from) < 1) return;
      // The arriving step's text starts as the glide does, rising while it slides in.
      markSeen([index]);
      if (reducedMotion()) {
        track.scrollLeft = to;
        return;
      }
      unsettle();
      // Snapping would fight each frame's position, so it waits until the step has landed.
      track.style.scrollSnapType = 'none';
      const duration = glideMs((to - from) / width);
      const start = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        track.scrollLeft = from + (to - from) * easeInOutCubic(t);
        if (t < 1) {
          glide.current = requestAnimationFrame(frame);
        } else {
          glide.current = undefined;
          track.style.scrollSnapType = '';
        }
      };
      glide.current = requestAnimationFrame(frame);
    },
    [markSeen, stopGlide, unsettle],
  );

  // Where the strip is, read on every scroll frame: the step (for the dots and
  // screen readers), the text to bring in, and the dots, drawn straight onto
  // the page so they move with the strip without a render a frame.
  const onScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const position = track.scrollLeft / track.clientWidth;
    setStep(Math.min(STEP_COUNT - 1, Math.max(0, Math.round(position))));
    markSeen(stepsInView(position, STEP_COUNT));
    dotRefs.current.forEach((dot, index) => {
      if (!dot) return;
      const { width, opacity } = dotAt(position, index);
      dot.style.width = `${width}px`;
      dot.style.opacity = String(opacity);
    });
    unsettle();
    settleTimer.current = window.setTimeout(() => setSettled(true), 150);
  }, [markSeen, unsettle]);

  /*
   * Mouse dragging. The strip follows the pointer with snapping switched off,
   * then glides on to the neighbouring step once the drag passes a threshold.
   * The pointer is only captured once it has actually moved, so a plain click
   * still reaches the buttons; a click that ends a drag is swallowed.
   */
  const drag = React.useRef<{ startX: number; startLeft: number; from: number; dragging: boolean } | null>(
    null,
  );
  const justDragged = React.useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    // A finger on the strip takes over from any glide, and the neighbours show at once.
    stopGlide();
    unsettle();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
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
    const target = Math.min(STEP_COUNT - 1, Math.max(0, state.from + shift));
    goTo(target);
    // Already there (a drag back to where it began): snapping simply returns.
    if (glide.current === undefined) track.style.scrollSnapType = '';

    justDragged.current = true;
    // Long enough for the click that ends this drag, which comes just after.
    window.setTimeout(() => {
      justDragged.current = false;
    }, 100);
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
        onWheel={stopGlide}
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
            data-active={seen.includes(index)}
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
      <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--header-gap)-19px)] z-10 flex justify-center">
        {steps.map((_, index) => {
          // Where it starts. Fixed, so a render never undoes the size onScroll drew.
          const { width, opacity } = dotAt(0, index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to step ${index + 1}`}
              aria-current={index === step ? 'step' : undefined}
              // A 44px-tall target around a 6px dot.
              className="group pointer-events-auto flex h-11 min-w-6 items-center justify-center px-[3px]"
            >
              <span
                ref={(element) => {
                  dotRefs.current[index] = element;
                }}
                // Sized from the strip's position as it moves (onScroll).
                style={{ width, opacity }}
                className="block h-1.5 rounded-full bg-white"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
