'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { CircleFeed } from '@/components/circles/circle-feed';
import { CircleSettings } from '@/components/circles/circle-settings';
import { CirclesUnavailable } from '@/components/circles/circles-unavailable';
import { GroupStreak } from '@/components/circles/group-streak';
import { HereNow } from '@/components/circles/here-now';
import { circlesErrorMessage } from '@/components/circles/messages';
import { NextSessionCard } from '@/components/circles/next-session-card';
import { TodayPromptCard } from '@/components/circles/today-prompt-card';
import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton } from '@/components/shared/skeleton';
import { useCircle } from '@/hooks/use-circle';
import { useCirclePresence } from '@/hooks/use-circle-presence';
import * as api from '@/lib/circles/api';
import { CirclesError } from '@/lib/circles/api';
import { buildFeed } from '@/lib/circles/feed';
import { describeDays, formatClock } from '@/lib/circles/format';
import { currentOrNextOccurrence, livePhase } from '@/lib/circles/schedule';
import { dateKeyInZone } from '@/lib/circles/tz';
import { formatMinutesLabel } from '@/lib/format';
import { useCircles } from '@/providers/circles-provider';

const WEEK_MS = 7 * 86_400_000;

/**
 * One circle. Before joining: what it is, when it meets, how many are in it.
 * After: the next session, the group's streak, today's prompt, the week's
 * feed, and the member's own settings.
 */
export function CircleView() {
  const id = useSearchParams().get('id');
  const { status, userId, isMember, join, muted, toggleMute, memberships } = useCircles();
  const { circle, inside, loading, error, reload } = useCircle(id);

  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);

  const member = id ? isMember(id) : false;
  const occurrence = circle && now ? currentOrNextOccurrence(circle, now) : null;
  const phase = occurrence && now ? livePhase(occurrence, now) : 'upcoming';
  const roomOpen = phase === 'lobby' || phase === 'live' || phase === 'closing';

  // Watch the room while it is open, without appearing in it.
  const presence = useCirclePresence({
    circleId: id ?? '',
    active: Boolean(id && member && roomOpen),
    me: null,
  });

  if (status === 'unconfigured') {
    return (
      <div className="pb-4">
        <ScreenHeader title="Circles" />
        <CirclesUnavailable />
      </div>
    );
  }

  if (!id || (error && !circle)) {
    return (
      <div className="pb-4">
        <ScreenHeader title="Circles" />
        <p className="mt-8 px-8 text-center text-[13px] text-ink-muted">
          {error === 'offline'
            ? circlesErrorMessage('offline')
            : circlesErrorMessage(id ? error : 'missing')}
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/circles" className="text-[13px] font-medium text-ink-soft hover:text-ink">
            Back to Circles
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !circle || now === null) {
    return (
      <div className="pb-4">
        <ScreenHeader title="Circles" />
        <div className="mt-6 space-y-2.5 px-5">
          <Skeleton className="h-[128px]" />
          <Skeleton className="h-[92px]" />
          <Skeleton className="h-[160px]" />
        </div>
      </div>
    );
  }

  const eyebrow =
    circle.memberCount === 0
      ? 'New circle'
      : `${circle.memberCount} ${circle.memberCount === 1 ? 'member' : 'members'}`;

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await join(circle.id);
      await reload();
    } catch (caught) {
      setJoinError(circlesErrorMessage(caught instanceof CirclesError ? caught.code : 'unknown'));
    } finally {
      setJoining(false);
    }
  };

  if (!member) {
    const atLimit = memberships.length >= 2;
    const full = circle.memberCount >= circle.capacity;

    return (
      <div className="pb-4">
        <ScreenHeader eyebrow={eyebrow} title={circle.name} />
        <section className="mt-6 space-y-2.5 px-5">
          <div className="rounded-tile bg-surface p-4">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">{circle.description}</p>
            <p className="mt-3 text-[12px] text-ink-soft">
              {describeDays(circle.sessionDays)}
              {occurrence ? ` at ${formatClock(occurrence.startsAt)} your time` : ''} ·{' '}
              {formatMinutesLabel(circle.durationSeconds)}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-faint">
              {circle.memberCount === 0
                ? 'Be one of the first.'
                : `Room for ${Math.max(0, circle.capacity - circle.memberCount)} more.`}
            </p>
          </div>

          <GradientButton
            type="button"
            onClick={() => void handleJoin()}
            disabled={joining || atLimit || full}
            className="h-11 w-full gap-2 text-[13px]"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
            {full ? 'This circle is full' : `Join ${circle.name}`}
          </GradientButton>

          <p className="px-1 text-[11.5px] leading-relaxed text-ink-faint">
            {atLimit
              ? circlesErrorMessage('too_many_circles')
              : 'Joining creates a private account on this device. No email needed.'}
          </p>
          {joinError ? <p className="px-1 text-[12px] text-ink-muted">{joinError}</p> : null}
        </section>
      </div>
    );
  }

  const todayKey = dateKeyInZone(now, circle.tz);
  const sittersToday = inside
    ? new Set(inside.checkins.filter((row) => row.localDate === todayKey).map((row) => row.userId)).size
    : 0;

  const feed = inside
    ? buildFeed({
        roster: inside.roster,
        checkins: inside.checkins,
        responses: inside.responses,
        mutedIds: muted,
        selfId: userId ?? undefined,
        since: now - WEEK_MS,
      })
    : [];

  const myAnswer = inside?.responses.find(
    (row) => row.userId === userId && row.localDate === inside.today.today,
  );

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow={eyebrow} title={circle.name} />

      <section className="mt-6 space-y-2.5 px-5">
        <NextSessionCard circle={circle} now={now}>
          <HereNow present={presence.present} connected={presence.connected} selfId={userId} />
        </NextSessionCard>

        {inside ? (
          <GroupStreak
            days={inside.days}
            todayKey={todayKey}
            sittersToday={sittersToday}
            memberCount={circle.memberCount}
          />
        ) : null}

        {inside ? (
          <TodayPromptCard
            circleId={circle.id}
            today={inside.today}
            myAnswer={myAnswer}
            onSaved={() => void reload()}
          />
        ) : null}
      </section>

      {error === 'offline' ? (
        <p className="mt-3 px-6 text-[11.5px] text-ink-faint">{circlesErrorMessage('offline')}</p>
      ) : null}

      <section className="mt-7 px-5">
        <SectionTitle>This week</SectionTitle>
        <div className="mt-3">
          <CircleFeed
            items={feed}
            now={now}
            onMute={toggleMute}
            onReport={(item, reason) =>
              api.reportAnswer(circle.id, item.localDate, item.userId, reason).catch(() => {})
            }
          />
        </div>
      </section>

      <section className="mt-7 px-5">
        <SectionTitle>You and this circle</SectionTitle>
        <div className="mt-3">
          <CircleSettings circle={circle} />
        </div>
      </section>
    </div>
  );
}
