'use client';

import { cn } from '@/lib/utils';

interface TimerRingProps {
  /** 0-1 through the sit. */
  progress: number;
  className?: string;
  children?: React.ReactNode;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 88;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A closed ring for the unguided sit — distinct from the open arc on the
 * activities screen, which belongs to the reference artwork.
 *
 * The sweep is driven by `stroke-dashoffset` with a linear transition matched
 * to the countdown's 250ms tick, so it glides rather than stepping, without
 * re-rendering anything at frame rate.
 */
export function TimerRing({ progress, className, children }: TimerRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden="true" className="h-full w-full">
        <defs>
          <linearGradient id="timer-ring-gradient" x1="0.62" y1="0" x2="0.24" y2="1">
            <stop offset="0%" stopColor="#B96BF0" />
            <stop offset="34%" stopColor="#8A7AF2" />
            <stop offset="68%" stopColor="#4FBCE0" />
            <stop offset="100%" stopColor="#2FE0CB" />
          </linearGradient>
        </defs>

        {/* The untravelled remainder, so the ring reads as a whole. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
        />

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="url(#timer-ring-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          style={{
            transition: 'stroke-dashoffset 260ms linear',
            willChange: 'stroke-dashoffset',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
