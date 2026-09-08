'use client';

import * as React from 'react';

import { clamp, describeArc, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProgressArcProps {
  /** Completion as a 0–1 fraction. */
  value: number;
  className?: string;
  /** Unique per instance so multiple arcs can coexist on one screen. */
  gradientId?: string;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 84;
const STROKE = 15;
/** Degrees clockwise from twelve o'clock — the open side faces left. */
const START_ANGLE = 300;

/**
 * The open ring from the activities screen: violet at the top end, cyan at the
 * bottom, rounded caps, and no visible track behind the untravelled portion.
 */
export function ProgressArc({ value, className, gradientId = 'arc-gradient' }: ProgressArcProps) {
  const fraction = clamp(value, 0, 1);
  const [revealed, setRevealed] = React.useState(false);

  // Draw the sweep on after the first paint so the ring animates into place.
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const path = describeArc(CENTER, CENTER, RADIUS, START_ANGLE, fraction * 360);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      role="img"
      aria-label={`Daily goal ${formatPercent(fraction)} complete`}
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0.62" y1="0" x2="0.24" y2="1">
          <stop offset="0%" stopColor="#B96BF0" />
          <stop offset="34%" stopColor="#8A7AF2" />
          <stop offset="68%" stopColor="#4FBCE0" />
          <stop offset="100%" stopColor="#2FE0CB" />
        </linearGradient>
      </defs>

      {/*
        At zero the arc would still paint its rounded cap — a stray dot floating
        where the ring starts. An empty day shows nothing instead. The reference
        has no track behind the untravelled portion, so none is drawn here.
      */}
      {fraction > 0.001 ? (
      <path
        d={path}
        stroke={`url(#${gradientId})`}
        strokeWidth={STROKE}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={revealed ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
      />
      ) : null}
    </svg>
  );
}
