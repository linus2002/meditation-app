'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Radio, Users } from 'lucide-react';

import { CirclesUnavailable } from '@/components/circles/circles-unavailable';
import { circlesErrorMessage } from '@/components/circles/messages';
import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton } from '@/components/shared/skeleton';
import { formatClock, sessionDayLabel } from '@/lib/circles/format';
import { currentOrNextOccurrence, livePhase } from '@/lib/circles/schedule';
import { useCircles } from '@/providers/circles-provider';

/**
 * The way into Circles: the reader's own circles, or — before they have one —
 * what a circle is and a single button to find one.
 */
export default function CirclesPage() {
  const { status, hydrated, memberships } = useCircles();

  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (status === 'unconfigured') {
    return (
      <div className="pb-4">
        <ScreenHeader eyebrow="Sit together" title="Circles" />
        <CirclesUnavailable />
      </div>
    );
  }

  const ready = hydrated && now !== null && status !== 'loading';

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Sit together" title="Circles" />

      {!ready ? (
        <div className="mt-6 space-y-2.5 px-5">
          <Skeleton className="h-[84px]" />
          <Skeleton className="h-[84px]" />
        </div>
      ) : memberships.length > 0 ? (
        <section className="mt-6 px-5">
          <SectionTitle>Your circles</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {memberships.map(({ circle }) => {
              const occurrence = currentOrNextOccurrence(circle, now);
              const phase = occurrence ? livePhase(occurrence, now) : 'upcoming';
              const open = phase === 'lobby' || phase === 'live';

              return (
                <li key={circle.id}>
                  <Link
                    href={{ pathname: '/circles/view', query: { id: circle.id } }}
                    className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
                      {open ? (
                        <Radio className="h-[18px] w-[18px] text-ink" strokeWidth={1.7} />
                      ) : (
                        <Users className="h-[18px] w-[18px] text-ink-soft" strokeWidth={1.7} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold leading-tight text-ink">
                        {circle.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                        {open
                          ? 'The room is open now'
                          : occurrence
                            ? `${sessionDayLabel(occurrence.startsAt, now)} at ${formatClock(occurrence.startsAt)}`
                            : 'No sessions scheduled'}
                        {' · '}
                        {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-faint" strokeWidth={1.8} />
                  </Link>
                </li>
              );
            })}
          </ul>

          {status === 'offline' ? (
            <p className="mt-3 px-1 text-[11.5px] text-ink-faint">{circlesErrorMessage('offline')}</p>
          ) : null}

          {memberships.length < 2 ? (
            <Link
              href="/circles/join"
              className="mt-5 block text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
            >
              Find another circle
            </Link>
          ) : null}
        </section>
      ) : (
        <section className="mt-6 px-5">
          <div className="rounded-tile bg-surface p-5">
            <p className="text-[16px] font-semibold leading-snug text-ink">
              Meditate with a small circle
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
              A few people who want the same thing, sitting at the same time each day. You see
              when they have sat, and they see when you have. No leaderboards, and nobody keeping
              score — the streak belongs to the whole circle.
            </p>
            <GradientButton asChild className="mt-5 h-11 w-full text-[13px]">
              <Link href="/circles/join">Find your circle</Link>
            </GradientButton>
          </div>
        </section>
      )}
    </div>
  );
}
