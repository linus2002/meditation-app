'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Sprout } from 'lucide-react';

import { DAILY_GOAL_MINUTES } from '@/data/stats';
import { toDateKey } from '@/lib/date';
import { currentStreak, summariseDay } from '@/lib/session-stats';
import { useApp } from '@/providers/app-provider';

const RING_RADIUS = 21;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * The row at the top of the library: today's mindful minutes against the
 * daily goal, as a ring that fills while you sit, with the streak beside it.
 * It opens the activities screen, where the full record lives.
 */
export function TargetCard() {
  const { sessions, hydrated } = useApp();

  // The date is read on the client: the page is prerendered at build time.
  const [today, setToday] = React.useState<Date | null>(null);
  React.useEffect(() => setToday(new Date()), []);

  const ready = hydrated && today !== null;
  const day = ready ? summariseDay(sessions, toDateKey(today), DAILY_GOAL_MINUTES) : null;
  const streak = ready ? currentStreak(sessions, today) : 0;
  const reached = day !== null && day.completion >= 1;

  const title = reached ? 'Daily goal reached' : 'Today’s mindful minutes';
  const detail = !day
    ? `Your daily goal is ${DAILY_GOAL_MINUTES} min`
    : [
        `${day.minutes} of ${day.goalMinutes} min`,
        streak >= 2 ? `${streak}-day streak` : day.minutes === 0 ? 'Start with a short sit' : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <Link
      href="/activities"
      aria-label={`${title}. ${detail}. Open your activity.`}
      className="relative flex items-center gap-3.5 overflow-hidden rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      {/* A faint wash of the progress colours behind the ring. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_18%_50%,rgba(29,159,218,0.16),transparent_70%)]"
      />

      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
          <defs>
            <linearGradient id="target-card-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1D9FDA" />
              <stop offset="100%" stopColor="#61A644" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="3.5" className="stroke-overlay/10" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="url(#target-card-ring)"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - (day?.completion ?? 0))}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            // A ring with nothing in it yet shows only the track.
            opacity={day && day.completion > 0 ? 1 : 0}
          />
        </svg>
        <Sprout className="h-5 w-5 text-aurora-lime" strokeWidth={1.9} />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-caption leading-tight text-ink-muted">
          {detail}
        </span>
      </span>
      <ChevronRight className="relative h-5 w-5 shrink-0 text-ink-faint" strokeWidth={1.8} />
    </Link>
  );
}
