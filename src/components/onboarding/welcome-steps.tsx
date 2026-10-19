'use client';

import type * as React from 'react';
import Image from 'next/image';
import { PersonStanding, Sparkles, Users, type LucideIcon } from 'lucide-react';

import { AuroraSweep } from '@/components/onboarding/aurora-sweep';
import { SerenityMark, SerenityRing } from '@/components/onboarding/serenity-mark';
import { DiagonalSlashes, WaveLines } from '@/components/shared/decor';
import { GradientButton } from '@/components/shared/gradient-button';
import { photos } from '@/data/images';
import { cn } from '@/lib/utils';

/**
 * Marks an element to rise into view when its step is on screen, `delay`
 * milliseconds after the step arrives. See `.reveal` in globals.css.
 */
function reveal(delay: number): { className: string; style: React.CSSProperties } {
  return { className: 'reveal', style: { '--reveal-delay': `${delay}ms` } as React.CSSProperties };
}

/**
 * Step one: the sweep fills the screen, the mark and tagline sit low, and two
 * stacked actions close it out — a filled primary and an outlined secondary.
 *
 * Serenity has no accounts, so the secondary skips ahead rather than pretending
 * there is somewhere to sign in.
 */
export function WelcomeIntro({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col">
      <AuroraSweep className="absolute inset-0" />

      <div className="relative mt-auto px-7 pb-[clamp(24px,4.4vh,40px)]">
        <div {...reveal(0)}>
          <SerenityMark />
        </div>

        <p
          {...reveal(150)}
          className="reveal mt-[clamp(10px,1.9vh,16px)] text-center text-[clamp(0.875rem,3.85vw,0.9375rem)] font-normal leading-[1.6] text-ink-soft">
          Quiet, wherever you are
        </p>

        <GradientButton
          onClick={onNext}
          style={reveal(300).style}
          className="reveal mt-[clamp(26px,5vh,44px)] h-[clamp(52px,7.35vh,62px)] w-full"
        >
          Get Started
        </GradientButton>

        <p
          style={reveal(420).style}
          className="reveal mt-[clamp(14px,2.4vh,20px)] text-center text-body-sm leading-none text-ink-muted"
        >
          Been here before?
        </p>

        <button
          type="button"
          onClick={onSkip}
          style={reveal(480).style}
          className="reveal mt-[clamp(10px,1.9vh,16px)] h-[clamp(50px,7vh,56px)] w-full rounded-full border border-overlay/30 text-[0.9375rem] font-semibold text-ink transition-colors duration-150 hover:border-overlay/55 hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Skip the tour
        </button>
      </div>
    </div>
  );
}

/** The artwork drifting behind step two, tilted as one plane. */
const TILE_IMAGES = [
  photos.meditationSunrise,
  photos.oceanWave,
  photos.milkyWay,
  photos.forestLight,
  photos.palmDusk,
  photos.mountainValley,
  photos.ancientTree,
  photos.duskRidge,
  photos.aerialSea,
  photos.morningField,
  photos.starfield,
  photos.forestBridge,
  photos.openArms,
  photos.sunriseHills,
  photos.nightSky,
];

const ROWS = 4;
const PER_ROW = 5;

/** Five tiles per row, taken from the artwork in turn so neighbours differ. */
const TILE_ROWS = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: PER_ROW }, (_, col) => TILE_IMAGES[(row * PER_ROW + col) % TILE_IMAGES.length]),
);

/**
 * Step two: rows of session artwork drifting past on a tilt, alternate rows in
 * opposite directions, with the promise set over it and a single action.
 */
export function WelcomeLibrary({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      {/* Oversized and rotated, so the grid bleeds past all four edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-6%] h-[92%] w-[168%] -translate-x-1/2 rotate-[-9deg]"
      >
        <div className="flex flex-col gap-2.5">
          {TILE_ROWS.map((row, rowIndex) => (
            // Each row repeats its tiles once so the loop never shows a gap.
            <div
              key={rowIndex}
              className={cn('marquee flex w-max', rowIndex % 2 === 1 && 'marquee-reverse')}
              style={
                {
                  opacity: rowIndex === ROWS - 1 ? 0.55 : 1,
                  '--marquee-duration': `${44 + rowIndex * 8}s`,
                } as React.CSSProperties
              }
            >
              {[...row, ...row].map((image, index) => (
                <div key={index} className="pr-2.5">
                  <div className="relative aspect-[3/2] w-[158px] overflow-hidden rounded-xl">
                    <Image src={image} alt="" fill sizes="158px" placeholder="blur" className="object-cover" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Scrim so the headline reads over whatever lands behind it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,36,0.35)_0%,rgba(10,12,36,0.1)_22%,rgba(10,12,36,0.82)_54%,#0A0C24_70%)]"
      />

      <div className="relative mt-auto px-7 pb-[clamp(24px,4.4vh,40px)]">
        <h2
          style={reveal(0).style}
          className="reveal text-[clamp(1.625rem,8.2vw,2.0625rem)] font-semibold leading-[1.24] tracking-[-0.02em] text-ink"
        >
          Sessions, sleep sounds, breathing and stories
          <span className="text-aurora-blush"> — all in one quiet place.</span>
        </h2>

        <GradientButton
          onClick={onNext}
          style={reveal(250).style}
          className="reveal mt-[clamp(24px,4.6vh,40px)] h-[clamp(52px,7.35vh,62px)] w-full"
        >
          Next
        </GradientButton>
      </div>
    </div>
  );
}

/** What's new since the original tour. `ring` is drawn with the app's own logo. */
const NEW_FEATURES: { title: string; body: string; icon: LucideIcon | 'ring' }[] = [
  {
    title: 'Yoga',
    body: 'Gentle, guided yoga — one pose at a time, with a soft bell to move.',
    icon: PersonStanding,
  },
  {
    title: 'Circles',
    body: 'Sit with a small group at the same time each day. No scores, just company.',
    icon: Users,
  },
  {
    title: 'Kapwa',
    body: 'Your built-in guide, in the middle of the menu. Tell it how you feel.',
    icon: 'ring',
  },
  {
    title: 'Daily inspiration',
    body: 'One short, kind message each day, chosen for how you’re doing.',
    icon: Sparkles,
  },
];

/**
 * Step three: what's new. Four features, each an icon and one line, on the same
 * dark ground as the rest of the tour with a soft blue and green glow behind.
 */
export function WelcomeFeatures({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <WaveLines className="left-0 top-0 h-[300px] w-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(29,159,218,0.35)_0%,rgba(29,159,218,0)_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-40 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(97,166,68,0.28)_0%,rgba(97,166,68,0)_70%)]"
      />

      <div className="relative mt-auto px-7 pb-[clamp(24px,4.4vh,40px)]">
        <p
          style={reveal(0).style}
          className="reveal text-caption font-semibold uppercase tracking-[0.16em] text-aurora-blue"
        >
          New in Serenity
        </p>
        <h2
          style={reveal(100).style}
          className="reveal mt-3 text-[clamp(1.625rem,8.2vw,2.0625rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink"
        >
          More ways to <span className="block text-aurora-green">feel better</span>
        </h2>

        <ul className="mt-[clamp(18px,3.4vh,28px)] space-y-[clamp(10px,1.8vh,14px)]">
          {NEW_FEATURES.map(({ title, body, icon: Icon }, index) => (
            <li
              key={title}
              style={reveal(220 + index * 90).style}
              className="reveal flex items-start gap-3.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface">
                {Icon === 'ring' ? (
                  <SerenityRing className="h-6 w-6" />
                ) : (
                  <Icon className="h-5 w-5 text-ink-soft" strokeWidth={1.7} />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[0.9375rem] font-semibold leading-tight text-ink">{title}</p>
                <p className="mt-1 text-caption leading-snug text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <GradientButton
          onClick={onNext}
          style={reveal(640).style}
          className="reveal mt-[clamp(24px,4.6vh,40px)] h-[clamp(52px,7.35vh,62px)] w-full"
        >
          Next
        </GradientButton>
      </div>
    </div>
  );
}

/**
 * Step four is the original reference screen — headline weight mix,
 * wave lines, leaning bars and the gradient pill, in their original proportions.
 * It was always an intro screen; this is simply where it belongs in the flow.
 */
export function WelcomeIntent({ onDone }: { onDone: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col">
      <WaveLines className="left-0 top-0 h-[300px] w-full" />
      <div className="relative mt-auto px-7 pb-[clamp(20px,3.3vh,28px)]">
        <div {...reveal(0)}>
          <DiagonalSlashes className="relative mb-[clamp(26px,4.7vh,40px)] ml-[36%] w-[59%]" />
        </div>
        {/* The reference's light-to-bold weight mix, with words about calm rather than tracking. */}
        <h1
          style={reveal(120).style}
          className="reveal text-[clamp(1.625rem,8.2vw,2.0625rem)] leading-[1.24] tracking-[-0.02em] text-ink"
        >
          <span className="block font-light">Calm,</span>
          <span className="block font-light">
            one <span className="font-semibold">breath</span>
          </span>
          <span className="block font-semibold">at a time</span>
        </h1>

        <p
          style={reveal(300).style}
          className="reveal mt-[clamp(12px,1.9vh,16px)] max-w-[300px] text-[clamp(0.875rem,3.85vw,0.9375rem)] font-normal leading-[1.6] text-ink-muted">
          Short sessions for stress, sleep and harder days. Go at your own pace. Everything you
          do here stays on your phone.
        </p>

        <GradientButton
          onClick={onDone}
          style={reveal(460).style}
          className="reveal mt-[clamp(22px,4.3vh,36px)] h-[clamp(52px,7.35vh,62px)] w-full"
        >
          Get Started
        </GradientButton>
      </div>
    </div>
  );
}
