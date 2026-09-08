'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { DateStrip } from '@/components/activities/date-strip';
import { ProgressArc } from '@/components/activities/progress-arc';
import { StatBlock } from '@/components/activities/stat-block';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EdgeCurves, StitchArc } from '@/components/shared/decor';
import { GradientButton } from '@/components/shared/gradient-button';
import { ACTIVITY_DAY_COUNT, DAILY_GOAL_MINUTES } from '@/data/stats';
import { monthLabel, toDateKey } from '@/lib/date';
import { formatPercent } from '@/lib/format';
import { recentDays, summariseDay } from '@/lib/session-stats';
import { useApp } from '@/providers/app-provider';
import type { DaySummary } from '@/types';

/** Shown before the local date is known, so the layout never shifts. */
const EMPTY_DAY: DaySummary = {
  date: '',
  day: 0,
  seconds: 0,
  minutes: 0,
  goalMinutes: DAILY_GOAL_MINUTES,
  sessions: 0,
  completion: 0,
  firstSitAt: null,
  totalTime: '00:00',
};

/**
 * The reference shows this as a pushed detail screen — it carries a back
 * control and no bottom navigation, so it owns the full height of the frame.
 * The ring sits hard against the left edge with the three figures stacked
 * down the right-hand column.
 *
 * Every figure is derived from sessions actually recorded on the device.
 */
export default function ActivitiesPage() {
  const { sessions, hydrated } = useApp();

  // The local date is resolved on the client: these pages are prerendered at
  // build time, so reading the clock during render would bake in the build day.
  const [today, setToday] = React.useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>('');

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate((current) => current || toDateKey(now));
  }, []);

  const days = React.useMemo(
    () => (today ? recentDays(sessions, today, ACTIVITY_DAY_COUNT, DAILY_GOAL_MINUTES) : []),
    [sessions, today],
  );

  const day = React.useMemo(
    () =>
      selectedDate && hydrated
        ? summariseDay(sessions, selectedDate, DAILY_GOAL_MINUTES)
        : EMPTY_DAY,
    [sessions, selectedDate, hydrated],
  );

  return (
    <div className="relative flex min-h-full flex-col">
      <EdgeCurves className="-right-3 top-[34%] h-[340px] w-[110px]" />
      <StitchArc className="-left-16 bottom-[8%] h-[clamp(108px,38vw,150px)] w-[clamp(108px,38vw,150px)]" />

      <ScreenHeader
        eyebrow={selectedDate ? monthLabel(selectedDate) : ''}
        title="Daily Activities"
        className="pt-[clamp(20px,6.6vh,56px)]"
      />

      <DateStrip days={days} selectedDate={selectedDate} onSelect={setSelectedDate} />

      <section
        aria-label="Day summary"
        className="relative mt-[clamp(24px,6.6vh,64px)] flex h-[clamp(248px,38vh,320px)] items-center px-5"
      >
        <div className="relative -ml-[7vw] aspect-square w-[56vw] max-w-[240px] shrink-0">
          <ProgressArc value={day.completion} />
          <p className="absolute left-[13%] top-1/2 -translate-y-1/2 text-[clamp(22px,7.9vw,31px)] font-semibold leading-none tracking-[-0.02em] text-ink">
            {formatPercent(day.completion)}
          </p>
        </div>

        <div className="flex h-full min-w-0 flex-1 flex-col justify-between pl-1">
          <StatBlock
            label="Mindful Min"
            value={String(day.minutes)}
            suffix={`/${day.goalMinutes}`}
            size="hero"
          />
          <StatBlock label="First Sit" value={day.firstSitAt ?? '--:--'} />
          <StatBlock label="Total Time" value={day.totalTime} />
        </div>
      </section>

      {hydrated && day.sessions === 0 ? (
        <p className="relative -mt-2 px-5 text-[11.5px] leading-relaxed text-ink-faint">
          Nothing recorded for this day yet. Finish a session and it lands here.
        </p>
      ) : null}

      <div className="mt-auto flex justify-end pb-[clamp(16px,3.8vh,32px)]">
        <GradientButton tone="analytics" asChild className="-mr-5 h-12 pl-7 pr-12 text-[13px]">
          <Link href="/sleep">
            Sleep Analytics
            <ArrowRight className="ml-3 h-4 w-4" strokeWidth={1.75} />
          </Link>
        </GradientButton>
      </div>
    </div>
  );
}
