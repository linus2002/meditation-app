'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton } from '@/components/shared/skeleton';
import { getMeditation } from '@/data/meditations';
import { moodLabel } from '@/data/moods';
import { UNGUIDED_ID } from '@/data/timer';
import { useToday } from '@/hooks/use-today';
import { fromDateKey } from '@/lib/date';
import {
  formatShift,
  formatTotal,
  MIN_SAMPLE,
  monthInsights,
  monthKeyOf,
  monthName,
  shiftMonth,
  TIME_OF_DAY_LABELS,
} from '@/lib/insights';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

/** The colour of a day's mood in the chart: cool when low, bright when good. */
const MOOD_COLOURS = ['', '#7C6FD6', '#5B8FE0', '#1D9FDA', '#3FB27F', '#61A644'];

function sessionTitle(id: string): string {
  if (id === UNGUIDED_ID) return 'the unguided timer';
  return getMeditation(id)?.title ?? 'a session';
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-tile bg-surface p-4', className)}>{children}</div>;
}

/**
 * A month at a glance, in plain sentences: how much was sat, how the reader
 * felt, what changed across a session, and how sleep went on days they
 * meditated. Everything is worked out on the phone from what was recorded;
 * a comparison only appears once there is enough on both sides to make one.
 */
export default function InsightsPage() {
  const { sessions, moods, sleepLogs, weeklyGoalDays, hydrated } = useApp();
  const today = useToday();
  const [month, setMonth] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (today) setMonth((current) => current ?? monthKeyOf(today));
  }, [today]);

  // The earliest month with anything in it bounds the "previous" button.
  const firstMonth = React.useMemo(() => {
    const dates = [...sessions.map((s) => s.date), ...moods.map((m) => m.date), ...sleepLogs.map((l) => l.date)];
    return dates.length ? monthKeyOf(dates.sort()[0]) : null;
  }, [sessions, moods, sleepLogs]);

  const insights = React.useMemo(
    () =>
      month && today
        ? monthInsights({ sessions, moods, sleepLogs, weeklyGoalDays }, month, fromDateKey(today))
        : null,
    [month, today, sessions, moods, sleepLogs, weeklyGoalDays],
  );

  const ready = hydrated && insights !== null && today !== null && month !== null;
  const currentMonth = today ? monthKeyOf(today) : null;
  const canGoBack = ready && firstMonth !== null && month > firstMonth;
  const canGoForward = ready && currentMonth !== null && month < currentMonth;
  const isCurrent = month === currentMonth;
  const previousName = month ? monthName(shiftMonth(month, -1)).split(' ')[0] : '';

  return (
    <div className="relative flex min-h-full flex-col pb-8">
      <ScreenHeader eyebrow="Monthly insights" title={month ? monthName(month) : 'This month'} />

      <div className="mt-4 flex items-center justify-between px-5">
        <button
          type="button"
          onClick={() => month && setMonth(shiftMonth(month, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-overlay/[0.06] text-ink-muted transition-colors hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <p className="text-caption text-ink-muted" aria-live="polite">
          {month ? (isCurrent ? 'So far this month' : monthName(month)) : ''}
        </p>
        <button
          type="button"
          onClick={() => month && setMonth(shiftMonth(month, 1))}
          disabled={!canGoForward}
          aria-label="Next month"
          className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-overlay/[0.06] text-ink-muted transition-colors hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      {!ready ? (
        <div className="mt-5 space-y-3 px-5">
          <Skeleton className="h-[110px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[120px]" />
        </div>
      ) : (
        <div className="mt-5 space-y-6 px-5">
          {/* The month in one sentence. */}
          <Card>
            {insights.sessions === 0 ? (
              <p className="text-body-sm leading-relaxed text-ink">
                {isCurrent ? 'No sessions yet this month.' : 'No sessions that month.'}{' '}
                <span className="text-ink-muted">
                  {isCurrent ? 'Your first one will start the picture.' : ''}
                </span>
              </p>
            ) : (
              <p className="text-body-sm leading-relaxed text-ink">
                {isCurrent ? 'This month: ' : 'That month: '}
                <span className="font-semibold">{plural(insights.sessions, 'session')}</span>,{' '}
                <span className="font-semibold">{formatTotal(insights.seconds)}</span> across{' '}
                {plural(insights.daysSat, 'day')}.
                {insights.previous.sessions > 0 ? (
                  <span className="text-ink-muted">
                    {' '}
                    {insights.sessions > insights.previous.sessions
                      ? `${plural(insights.sessions - insights.previous.sessions, 'more session')} than ${previousName}.`
                      : insights.sessions === insights.previous.sessions
                        ? `The same as ${previousName}.`
                        : `${previousName} had ${plural(insights.previous.sessions, 'session')}.`}
                  </span>
                ) : null}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { label: 'Sessions', value: String(insights.sessions) },
                { label: 'Mindful', value: formatTotal(insights.seconds) },
                { label: 'Days sat', value: String(insights.daysSat) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-overlay/[0.04] px-2 py-3 text-center">
                  <p className="text-[1.0625rem] font-semibold leading-none tracking-[-0.02em] text-ink">{stat.value}</p>
                  <p className="mt-1.5 text-label leading-none text-ink-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Mood: the month by day, and what changes across a session. */}
          <section>
            <SectionTitle>Mood</SectionTitle>
            <Card className="mt-3">
              <div
                role="img"
                aria-label={
                  insights.moodDays > 0
                    ? `Mood by day: given on ${plural(insights.moodDays, 'day')}, on average ${moodLabel(insights.averageMood ?? 3).toLowerCase()}.`
                    : 'Mood by day: none given yet.'
                }
                className="flex h-[84px] items-end gap-[2px]"
              >
                {insights.days.map((day) => (
                  <div key={day.key} className="flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-full"
                      style={{
                        height: day.mood !== null ? `${Math.round((day.mood / 5) * 100)}%` : '3px',
                        background: day.mood !== null ? MOOD_COLOURS[Math.round(day.mood)] : 'rgb(var(--overlay) / 0.12)',
                        opacity: day.future ? 0.35 : 1,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-label text-ink-faint" aria-hidden="true">
                <span>1</span>
                <span>{insights.days.length}</span>
              </div>

              <p className="mt-3 text-caption leading-relaxed text-ink">
                {insights.averageMood !== null
                  ? `On average you felt ${moodLabel(insights.averageMood).toLowerCase()}, on the ${plural(insights.moodDays, 'day')} you gave a mood.`
                  : 'Check in on the home screen to see your mood here, day by day.'}
              </p>

              <div className="mt-3 border-t border-overlay/[0.08] pt-3">
                {insights.shift.pairs >= MIN_SAMPLE ? (
                  <p className="text-caption leading-relaxed text-ink">
                    {formatShift(insights.shift.average) === '0'
                      ? 'Your mood holds about steady across a session'
                      : insights.shift.average > 0
                        ? `After a session you feel ${formatShift(insights.shift.average).slice(1)} ${Math.abs(insights.shift.average) >= 0.95 && Math.abs(insights.shift.average) < 1.05 ? 'point' : 'points'} better on average`
                        : `After a session you feel ${formatShift(insights.shift.average).slice(1)} points lower on average`}
                    <span className="text-ink-muted">
                      {' '}
                      (better after {insights.shift.better} of {plural(insights.shift.pairs, 'session')}, on a 5-point scale).
                    </span>
                  </p>
                ) : (
                  <p className="text-label leading-relaxed text-ink-muted">
                    Answer “How are you feeling?” before and after a few sessions, and you’ll see here what a
                    session changes. {insights.shift.pairs > 0 ? `${insights.shift.pairs} of ${MIN_SAMPLE} so far.` : ''}
                  </p>
                )}
              </div>
            </Card>
          </section>

          {/* Sleep on days with and without practice. */}
          <section>
            <SectionTitle actionHref="/sleep" actionLabel="Sleep">
              Sleep
            </SectionTitle>
            <Card className="mt-3">
              {insights.sleep ? (
                <>
                  <p className="text-caption leading-relaxed text-ink">
                    {insights.sleep.withPractice - insights.sleep.without >= 0.25
                      ? 'You sleep better on days you meditate. '
                      : insights.sleep.without - insights.sleep.withPractice >= 0.25
                        ? 'This month you slept a little better on days you didn’t meditate. '
                        : 'Your sleep was about the same either way. '}
                    <span className="text-ink-muted">
                      You rated your nights {insights.sleep.withPractice.toFixed(1)} of 5 after a day you sat (
                      {plural(insights.sleep.nightsWith, 'night')}), and {insights.sleep.without.toFixed(1)} after one
                      you didn’t ({plural(insights.sleep.nightsWithout, 'night')}).
                    </span>
                  </p>
                  <p className="mt-2 text-label leading-relaxed text-ink-faint">
                    A pattern in your own logs, not proof of cause.
                  </p>
                </>
              ) : (
                <p className="text-label leading-relaxed text-ink-muted">
                  Log your nights on the{' '}
                  <Link href="/sleep" className="font-medium text-ink underline-offset-2 hover:underline">
                    Sleep
                  </Link>{' '}
                  screen. With {MIN_SAMPLE} or more nights after days you sat and {MIN_SAMPLE} after days you didn’t,
                  you’ll see whether meditating changes how you sleep.
                </p>
              )}
            </Card>
          </section>

          {/* Habits: what, when, and the weekly goal. */}
          {insights.sessions > 0 ? (
            <section>
              <SectionTitle>Your habits</SectionTitle>
              <Card className="mt-3">
                <ul className="space-y-2.5 text-caption leading-relaxed text-ink">
                  {insights.favourite ? (
                    <li>
                      Your favourite was <span className="font-semibold">{sessionTitle(insights.favourite.meditationId)}</span>
                      <span className="text-ink-muted"> ({plural(insights.favourite.count, 'time')}).</span>
                    </li>
                  ) : null}
                  {insights.usualTime ? (
                    <li>
                      You usually sit <span className="font-semibold">{TIME_OF_DAY_LABELS[insights.usualTime]}</span>.
                    </li>
                  ) : null}
                  <li>
                    Your longest session was <span className="font-semibold">{formatTotal(insights.longestSeconds)}</span>.
                  </li>
                  {insights.weeks.total > 0 ? (
                    <li>
                      You met your goal of {plural(weeklyGoalDays, 'day')} a week in{' '}
                      <span className="font-semibold">
                        {insights.weeks.met} of {plural(insights.weeks.total, 'week')}
                      </span>
                      .
                    </li>
                  ) : null}
                </ul>
              </Card>
            </section>
          ) : null}

          <p className="text-center text-label leading-relaxed text-ink-faint">
            Worked out on this phone from what you recorded. Your moods stay here.
          </p>
        </div>
      )}
    </div>
  );
}
