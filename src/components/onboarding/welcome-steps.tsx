'use client';

import Image from 'next/image';
import { PersonStanding, Sparkles, Users, type LucideIcon } from 'lucide-react';

import { AuroraSweep } from '@/components/onboarding/aurora-sweep';
import { SerenityMark, SerenityRing } from '@/components/onboarding/serenity-mark';
import { DiagonalSlashes, WaveLines } from '@/components/shared/decor';
import { GradientButton } from '@/components/shared/gradient-button';
import { photos } from '@/data/images';

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
        <SerenityMark />

        <p className="mt-[clamp(10px,1.9vh,16px)] text-center text-[clamp(16px,4.9vw,20px)] font-normal leading-snug text-ink">
          Quiet, wherever you are
        </p>

        <button
          type="button"
          onClick={onNext}
          className="mt-[clamp(26px,5vh,44px)] h-[clamp(52px,7.35vh,58px)] w-full rounded-full bg-ink text-[15px] font-semibold text-canvas transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-deep"
        >
          Get Started
        </button>

        <p className="mt-[clamp(14px,2.4vh,20px)] text-center text-[13.5px] leading-none text-ink-muted">
          Been here before?
        </p>

        <button
          type="button"
          onClick={onSkip}
          className="mt-[clamp(10px,1.9vh,16px)] h-[clamp(50px,7vh,56px)] w-full rounded-full border border-overlay/30 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-overlay/55 hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Skip the tour
        </button>
      </div>
    </div>
  );
}

/** The artwork tiled behind step two, tilted as one plane. */
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

/**
 * Step two: a tilted grid of session artwork running off every edge, with the
 * promise set over it and a single action.
 */
export function WelcomeLibrary({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      {/* Oversized and rotated, so the grid bleeds past all four edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-6%] h-[92%] w-[168%] -translate-x-1/2 rotate-[-9deg]"
      >
        <div className="grid grid-cols-4 gap-2.5">
          {TILE_IMAGES.map((image, index) => (
            <div
              key={index}
              className="relative aspect-[3/2] overflow-hidden rounded-xl"
              style={{ opacity: index > 11 ? 0.55 : 1 }}
            >
              <Image src={image} alt="" fill sizes="120px" placeholder="blur" className="object-cover" />
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
        <h2 className="text-[clamp(26px,8.2vw,33px)] font-semibold leading-[1.24] tracking-[-0.02em] text-ink">
          Sessions, sleep sounds, breathing and stories
          <span className="text-aurora-blush"> — all in one quiet place.</span>
        </h2>

        <button
          type="button"
          onClick={onNext}
          className="mt-[clamp(24px,4.6vh,40px)] h-[clamp(52px,7.35vh,58px)] w-full rounded-full bg-ink text-[15px] font-semibold text-canvas transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-deep"
        >
          Next
        </button>
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
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-aurora-blue">
          New in Serenity
        </p>
        <h2 className="mt-3 text-[clamp(26px,8.2vw,33px)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
          More ways to <span className="text-aurora-green">feel better</span>
        </h2>

        <ul className="mt-[clamp(18px,3.4vh,28px)] space-y-[clamp(10px,1.8vh,14px)]">
          {NEW_FEATURES.map(({ title, body, icon: Icon }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface">
                {Icon === 'ring' ? (
                  <SerenityRing className="h-6 w-6" />
                ) : (
                  <Icon className="h-5 w-5 text-ink-soft" strokeWidth={1.7} />
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold leading-tight text-ink">{title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onNext}
          className="mt-[clamp(24px,4.6vh,40px)] h-[clamp(52px,7.35vh,58px)] w-full rounded-full bg-ink text-[15px] font-semibold text-canvas transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-deep"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Step four is the original reference screen, unchanged — headline weight mix,
 * wave lines, leaning bars and the gradient pill, in their original proportions.
 * It was always an intro screen; this is simply where it belongs in the flow.
 */
export function WelcomeIntent({ onDone }: { onDone: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col">
      <WaveLines className="left-0 top-0 h-[300px] w-full" />
      <div className="relative mt-auto px-7 pb-[clamp(20px,3.3vh,28px)]">
        <DiagonalSlashes className="relative mb-[clamp(26px,4.7vh,40px)] ml-[36%] w-[59%]" />
        <h1 className="text-[clamp(34px,12.8vw,50px)] leading-[1.11] tracking-[-0.025em] text-ink">
          <span className="block font-light">Keep track</span>
          <span className="block font-light">
            of <span className="font-bold">Your</span>
          </span>
          <span className="block font-bold">Health</span>
        </h1>

        <p className="mt-[clamp(12px,1.9vh,16px)] max-w-[272px] text-[clamp(11.5px,3.33vw,13px)] font-normal leading-[1.62] text-ink-muted">
          Lorem ipsum dolor sit amet consectetur. Diam malesuada vestibulum adipiscing nisi amet
          vitae.
        </p>

        <GradientButton
          onClick={onDone}
          className="mt-[clamp(22px,4.3vh,36px)] h-[clamp(52px,7.35vh,62px)] w-full"
        >
          Get Started
        </GradientButton>
      </div>
    </div>
  );
}
