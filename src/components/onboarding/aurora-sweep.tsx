import type * as React from 'react';

import { cn } from '@/lib/utils';

interface Band {
  /** Size and resting position; the tilt lives in `rot` so it can animate. */
  className: string;
  /** Resting tilt. The sway animation swings around it. */
  rot: string;
  background: string;
  /** Timings for sway, colour flow and glow, plus a start offset. */
  sway: string;
  flow: string;
  glow: string;
  delay: string;
}

/*
 * The ribbons, back to front. The timings are deliberately unrelated numbers,
 * so no two bands ever line up and the movement never visibly repeats.
 */
const BANDS: Band[] = [
  // The wide ribbon sweeping down from the top-left.
  {
    className: '-left-[35%] -top-[10%] h-[52%] w-[180%] blur-[14px]',
    rot: '-27deg',
    background:
      'linear-gradient(92deg, rgba(58,208,216,0.0) 0%, rgba(64,196,224,0.75) 12%, rgba(97,166,68,0.92) 34%, rgba(29,159,218,0.95) 52%, rgba(97,166,68,0.8) 68%, rgba(70,150,230,0.45) 84%, rgba(20,28,110,0) 100%)',
    sway: '17s',
    flow: '12s',
    glow: '8s',
    delay: '0s',
  },
  // A brighter fold riding just above it.
  {
    className: '-left-[28%] top-[8%] h-[18%] w-[165%] blur-[10px]',
    rot: '-25deg',
    background:
      'linear-gradient(92deg, rgba(255,255,255,0) 0%, rgba(214,236,204,0.55) 22%, rgba(29,159,218,0.75) 44%, rgba(97,166,68,0.5) 66%, rgba(60,190,220,0.3) 82%, rgba(20,28,110,0) 100%)',
    sway: '13s',
    flow: '9s',
    glow: '5.5s',
    delay: '-4s',
  },
  // Turquoise underside, lower and slower.
  {
    className: '-left-[30%] top-[30%] h-[22%] w-[150%] blur-[18px]',
    rot: '-15deg',
    background:
      'linear-gradient(92deg, rgba(28,196,186,0.0) 0%, rgba(34,206,196,0.72) 18%, rgba(56,138,226,0.5) 48%, rgba(97,166,68,0.22) 72%, rgba(18,26,105,0) 100%)',
    sway: '21s',
    flow: '15s',
    glow: '9.5s',
    delay: '-9s',
  },
  // A thin blue-green thread for depth.
  {
    className: '-left-[20%] top-[24%] h-[6%] w-[140%] blur-[7px]',
    rot: '-21deg',
    background:
      'linear-gradient(92deg, rgba(29,159,218,0) 0%, rgba(29,159,218,0.8) 30%, rgba(97,166,68,0.55) 60%, rgba(40,50,160,0) 90%)',
    sway: '11s',
    flow: '7s',
    glow: '4.5s',
    delay: '-2s',
  },
];

/**
 * The full-bleed aurora behind the first onboarding screen.
 *
 * Built from layered gradients rather than an image: it scales to any handset
 * without shipping a large asset, and it uses Serenity's own palette rather
 * than borrowing anyone else's artwork. Each ribbon moves on its own like the
 * northern lights — swaying, its colours drifting along it, brightening and
 * fading — using the `.aurora-band` animations in globals.css.
 *
 * The bands are deliberately kept narrow and only lightly blurred — a wide,
 * heavy blur turns the whole thing into a flat wash and loses the folded look.
 */
export function AuroraSweep({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('overflow-hidden', className)}>
      {/* Dark base, so the bands have somewhere to read against. */}
      <div className="absolute inset-0 bg-[linear-gradient(168deg,#151A5E_0%,#101347_30%,#0C0E33_58%,#0A0C24_100%)]" />

      {BANDS.map((band) => (
        <div
          key={band.rot}
          className={cn('aurora-band absolute', band.className)}
          style={
            {
              backgroundImage: band.background,
              '--rot': band.rot,
              '--sway': band.sway,
              '--flow': band.flow,
              '--glow': band.glow,
              '--delay': band.delay,
              transform: `rotate(${band.rot})`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Darkens the corners so the bands read as a ribbon, not a wash. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_18%,rgba(10,12,36,0)_38%,rgba(10,12,36,0.55)_78%,rgba(10,12,36,0.85)_100%)]" />

      {/* Settles the lower half to solid canvas so the type stays legible. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,36,0)_34%,rgba(10,12,36,0.8)_56%,#0A0C24_74%)]" />
    </div>
  );
}
