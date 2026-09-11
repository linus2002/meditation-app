'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronsLeft } from 'lucide-react';

import { CirclesUnavailable } from '@/components/circles/circles-unavailable';
import { HereNow } from '@/components/circles/here-now';
import { BreathingOrb } from '@/components/player/breathing-orb';
import { VolumeControl } from '@/components/player/volume-control';
import { SessionComplete } from '@/components/session/session-complete';
import { GradientButton } from '@/components/shared/gradient-button';
import { Skeleton } from '@/components/shared/skeleton';
import { getMeditation } from '@/data/meditations';
import { useBreath } from '@/hooks/use-breath';
import { useCircle } from '@/hooks/use-circle';
import { useCirclePresence } from '@/hooks/use-circle-presence';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { useSyncedSession } from '@/hooks/use-synced-session';
import { useWakeLock } from '@/hooks/use-wake-lock';
import * as api from '@/lib/circles/api';
import { formatClock, formatCountdown, formatMinutesSeconds } from '@/lib/circles/format';
import { canJoin, LOBBY_OPENS_MS } from '@/lib/circles/schedule';
import { useApp } from '@/providers/app-provider';
import { useAudio } from '@/providers/audio-provider';
import { useCircles } from '@/providers/circles-provider';

/**
 * The circle's live room.
 *
 * No play or pause: the session runs on the circle's shared clock, so everyone
 * in the room is on the same breath, and someone who joins late starts where
 * the others are. Presence shows who is actually here. Leaving early is always
 * allowed and still records the time you sat.
 */
export function LiveRoom() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();

  const { status, userId, isMember } = useCircles();
  const { circle, loading } = useCircle(id || null);
  const meditation = circle ? (getMeditation(circle.meditationId) ?? null) : null;

  const synced = useSyncedSession(circle);
  const { occurrence, phase, elapsed, now } = synced;

  const { settings, markPlayed } = useApp();
  const audio = useAudio();
  const { play, stop, bell, breathCue, prime } = audio;

  const [joinedAt, setJoinedAt] = React.useState<number | null>(null);
  const [completed, setCompleted] = React.useState(false);
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    void api.getDisplayName().then(setName).catch(() => {});
  }, [userId]);

  const joined = joinedAt !== null;
  const sounding = joined && !completed && (phase === 'live' || phase === 'closing');
  const member = id ? isMember(id) : false;

  const recorder = useSessionRecorder(circle?.meditationId ?? '', { circleId: id || undefined });
  const breath = useBreath(meditation?.breathPattern ?? [], elapsed);

  const roomOpen = phase === 'lobby' || phase === 'live' || phase === 'closing';
  const presence = useCirclePresence({
    circleId: id,
    active: Boolean(id && member && !completed && (roomOpen || joined)),
    me: joined && userId ? { userId, name } : null,
  });

  useWakeLock(joined && !completed);

  // Seconds this person was actually here — not how far into the session it is.
  const presentSeconds =
    joinedAt !== null && occurrence
      ? Math.max(0, (Math.min(now, occurrence.endsAt) - Math.max(joinedAt, occurrence.startsAt)) / 1000)
      : 0;
  recorder.elapsedRef.current = presentSeconds;

  const joinRoom = () => {
    // Audio may only start inside the tap, so unlock it here.
    void prime();
    recorder.restart();
    setJoinedAt(now);
  };

  const stepAway = () => {
    recorder.commit(false);
    stop(0.8);
    router.push(`/circles/view?id=${id}`);
  };

  // The bed plays while this person is in a running session.
  const ambientOn = settings.ambient ?? true;
  const scape = meditation?.soundscape;
  React.useEffect(() => {
    if (sounding && ambientOn && scape) void play(scape);
    else if (!sounding) stop(1.2);
  }, [sounding, ambientOn, scape, play, stop]);

  React.useEffect(() => () => stop(0.4), [stop]);

  // Those waiting in the room hear a bell as the session begins.
  const previousPhase = React.useRef(phase);
  React.useEffect(() => {
    if (joined && previousPhase.current === 'lobby' && phase === 'live') bell();
    previousPhase.current = phase;
  }, [phase, joined, bell]);

  // The end, for everyone at once.
  React.useEffect(() => {
    if (!joined || completed || !occurrence || now < occurrence.endsAt) return;
    setCompleted(true);
    if (meditation) markPlayed(meditation.id);
    recorder.markFinished();
    recorder.commit(true);
    bell();
    stop(4);
  }, [joined, completed, occurrence, now, meditation, markPlayed, recorder, bell, stop]);

  // Cue tones and haptics on the shared breath, as in a solo session.
  const cuesOn = settings.breathCues ?? true;
  const hapticsOn = settings.haptics ?? false;
  const phaseIndex = breath.phaseIndex;
  const phaseLabel = breath.phase.label;
  React.useEffect(() => {
    if (!sounding) return;
    const label = phaseLabel.toLowerCase();
    const direction = label.includes('in') ? 'in' : label.includes('out') ? 'out' : null;
    if (!direction) return;
    if (cuesOn) breathCue(direction);
    if (hapticsOn && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(direction === 'in' ? 18 : 30);
    }
  }, [phaseIndex, sounding, cuesOn, hapticsOn, breathCue, phaseLabel]);

  const header = (
    <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
      <button
        type="button"
        onClick={() => (joined && !completed ? stepAway() : router.back())}
        aria-label="Go back"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <p className="text-[12px] leading-none text-ink-muted">{circle?.name ?? 'Circle'}</p>
      <span className="h-9 w-9" />
    </header>
  );

  if (status === 'unconfigured') {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <CirclesUnavailable />
      </div>
    );
  }

  if (loading || !circle || !meditation) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="flex flex-1 items-center justify-center px-7">
          {loading ? (
            <Skeleton className="h-[240px] w-[240px] rounded-full" />
          ) : (
            <p className="text-center text-[13px] text-ink-muted">This circle could not be found.</p>
          )}
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-[14px] text-ink">Join {circle.name} to sit with them.</p>
          <Link
            href={{ pathname: '/circles/view', query: { id } }}
            className="mt-4 text-[13px] font-medium text-ink-soft hover:text-ink"
          >
            See the circle
          </Link>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex min-h-full flex-col">
        {header}
        <div className="relative flex-1 px-7 pb-[clamp(18px,3.8vh,32px)] pt-4">
          <SessionComplete
            minutes={Math.max(1, Math.round(presentSeconds / 60))}
            againLabel="Back to the circle"
            onAgain={() => router.push(`/circles/view?id=${id}`)}
            rated={meditation}
          />
        </div>
      </div>
    );
  }

  const status_line = !occurrence
    ? 'No session is scheduled.'
    : phase === 'upcoming'
      ? `The room opens at ${formatClock(occurrence.startsAt - LOBBY_OPENS_MS)}.`
      : phase === 'lobby'
        ? `Begins ${formatCountdown(occurrence.startsAt - now)}. ${joined ? 'Settle in.' : ''}`
        : phase === 'ended'
          ? 'This session has finished.'
          : `${formatMinutesSeconds((occurrence.endsAt - now) / 1000)} left`;

  return (
    <div className="relative flex min-h-full flex-col">
      {header}

      <div className="relative flex flex-1 flex-col items-center justify-center px-7 py-[clamp(10px,2.4vh,24px)]">
        <BreathingOrb
          breath={breath}
          isPlaying={sounding}
          className="h-[min(64vw,33vh,248px)] w-[min(64vw,33vh,248px)]"
        />

        <div className="mt-[clamp(14px,3.8vh,32px)] text-center">
          <p className="text-[12px] leading-none text-ink-muted">Sitting together</p>
          <h1 className="mt-2 text-[clamp(21px,6.7vw,26px)] font-bold leading-tight tracking-[-0.02em] text-ink">
            {meditation.title}
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{status_line}</p>
        </div>

        <HereNow
          present={presence.present}
          connected={presence.connected}
          selfId={userId}
          className="mt-5 justify-center"
        />
      </div>

      <div className="relative px-7 pb-[clamp(18px,3.8vh,32px)]">
        <VolumeControl />

        {joined ? (
          <button
            type="button"
            onClick={stepAway}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full border border-overlay/25 text-[13px] font-medium text-ink transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Step away
          </button>
        ) : canJoin(phase) ? (
          <GradientButton type="button" onClick={joinRoom} className="mt-5 h-11 w-full text-[13px]">
            Join the room
          </GradientButton>
        ) : phase === 'closing' ? (
          <GradientButton asChild className="mt-5 h-11 w-full text-[13px]">
            <Link href={`/player/${meditation.id}`}>Sit on your own</Link>
          </GradientButton>
        ) : (
          <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-faint">
            You can join from five minutes before the start.
          </p>
        )}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
          Everyone hears their own guide, in step. Nobody can see or hear you.
        </p>
      </div>
    </div>
  );
}
