'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Flame } from 'lucide-react';

import { ReflectionCard } from '@/components/reflections/reflection-card';
import { GradientButton } from '@/components/shared/gradient-button';
import { toDateKey } from '@/lib/date';
import { DAILY_GOAL_MINUTES } from '@/data/stats';
import { formatMinutesLabel } from '@/lib/format';
import { currentStreak, summariseDay } from '@/lib/session-stats';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';
import type { Meditation } from '@/types';

interface SessionCompleteProps {
  /** Minutes just sat. */
  minutes: number;
  againLabel: string;
  onAgain: () => void;
  /** Offered as the next thing to do, if there is one worth offering. */
  nextUp?: Meditation | null;
  className?: string;
}

/**
 * The moment after a sitting ends. Three jobs, in order: say what was just
 * added, offer the day's reflection while it is still fresh, and point
 * somewhere next. Shared by the guided player and the unguided timer.
 *
 * Deliberately calm — no confetti, no score, no streak warning. The reflection
 * only appears if today's has not been written, so it never reads as a chore.
 */
export function SessionComplete({
  minutes,
  againLabel,
  onAgain,
  nextUp,
  className,
}: SessionCompleteProps) {
  const { sessions, reflections, hydrated } = useApp();

  // The local date is resolved on the client; these pages are prerendered.
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => setToday(toDateKey(new Date())), []);

  const day = React.useMemo(
    () => (today ? summariseDay(sessions, today, DAILY_GOAL_MINUTES) : null),
    [sessions, today],
  );
  const streak = React.useMemo(
    () => (today ? currentStreak(sessions, new Date()) : 0),
    [sessions, today],
  );

  const reflectionWritten = today ? reflections.some((entry) => entry.date === today) : true;
  const goalMet = (day?.minutes ?? 0) >= DAILY_GOAL_MINUTES;
  const percent = day ? Math.min(100, Math.round((day.minutes / day.goalMinutes) * 100)) : 0;

  return (
    <div className={cn('animate-rise-in', className)}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-action-pill">
          <Check className="h-7 w-7 text-white" strokeWidth={2.4} />
        </span>

        <p className="mt-4 text-[clamp(26px,8vw,32px)] font-bold leading-none tracking-[-0.02em] text-ink">
          {minutes} {minutes === 1 ? 'minute' : 'minutes'}
        </p>
        <p className="mt-2 text-[12.5px] leading-none text-ink-muted">added to today</p>
      </div>

      {/* Where the day now stands. */}
      {hydrated && day ? (
        <div className="mt-6 rounded-tile bg-[#141733] p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] leading-none text-ink-muted">Today</p>
            <p className="text-[12px] leading-none text-ink-soft">
              {day.minutes} / {day.goalMinutes} min
            </p>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-action-pill transition-[width] duration-700 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11.5px] leading-none text-ink-faint">
              {goalMet ? "That's the day's goal met." : `${day.goalMinutes - day.minutes} min to go.`}
            </p>
            {streak >= 2 ? (
              <p className="flex items-center gap-1.5 text-[11.5px] leading-none text-ink-soft">
                <Flame className="h-3.5 w-3.5 text-aurora-pink" strokeWidth={1.9} />
                {streak} days
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* The reflection, only while it is still unwritten. */}
      {hydrated && !reflectionWritten ? (
        <div className="mt-6">
          <p className="mb-3 text-[12px] leading-none text-ink-muted">While it is still fresh</p>
          <ReflectionCard />
        </div>
      ) : null}

      {nextUp ? (
        <div className="mt-6">
          <p className="mb-3 text-[12px] leading-none text-ink-muted">If you want to keep going</p>
          <Link
            href={`/player/${nextUp.id}`}
            className="flex items-center gap-3.5 rounded-tile bg-[#141733] p-3 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={nextUp.image}
                alt=""
                fill
                sizes="48px"
                placeholder="blur"
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold leading-tight text-ink">
                {nextUp.title}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-ink-muted">
                {formatMinutesLabel(nextUp.durationSeconds)} · {nextUp.narrator}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
          </Link>
        </div>
      ) : null}

      <GradientButton onClick={onAgain} className="mt-7 h-[clamp(52px,7.2vh,58px)] w-full">
        {againLabel}
      </GradientButton>

      <Link
        href="/activities"
        className="mt-3 block w-full rounded-full py-2 text-center text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        See your progress
      </Link>
    </div>
  );
}
