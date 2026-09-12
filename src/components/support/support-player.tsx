'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsLeft, Pause, Play } from 'lucide-react';

import { BreathingOrb } from '@/components/player/breathing-orb';
import { VolumeControl } from '@/components/player/volume-control';
import { GradientButton } from '@/components/shared/gradient-button';
import { DraftNotice, LargeTextToggle } from '@/components/support/support-parts';
import { EXTEND_SECONDS, supportDisclaimer, type SupportSession } from '@/data/support-track';
import { useBreath } from '@/hooks/use-breath';
import { usePlayer } from '@/hooks/use-player';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { formatMinutesSeconds } from '@/lib/circles/format';
import { formatMinutesLabel } from '@/lib/format';
import type { SupportListen } from '@/lib/support-history';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';

type Stage = 'intro' | 'playing' | 'done';

/**
 * The support track's player: as little to do as possible on a hard day.
 *
 * One large Start button. While playing, one large pause button and nothing
 * else that needs reading. No scrubber, no ratings, no streak, no daily goal —
 * the ending says one kind sentence and offers, for long infusions, to keep
 * going. The breath is a gentle in-and-out with no holds, and there are no
 * cue tones or vibrations, which can be unwelcome through nausea.
 *
 * Listening is recorded only in the track's private history, never in the
 * app's own sessions, so it cannot touch a streak, a goal or a Circle.
 */
export function SupportPlayer({
  session,
  largeText,
  onToggleLargeText,
  onListened,
}: {
  session: SupportSession;
  largeText: boolean;
  onToggleLargeText: () => void;
  onListened: (listen: SupportListen) => void;
}) {
  const router = useRouter();
  const { play: playBed, stop, bell, prime } = useAudio();

  const [stage, setStage] = React.useState<Stage>('intro');
  // The length of the current stretch; "keep going" starts a fresh one.
  const [stretch, setStretch] = React.useState(session.durationSeconds);

  const startedAtRef = React.useRef<number | null>(null);
  const listenedRef = React.useRef(0);

  const record = React.useCallback(
    (extraSeconds: number) => {
      if (startedAtRef.current === null) return;
      onListened({
        sessionId: session.id,
        startedAt: startedAtRef.current,
        seconds: Math.round(listenedRef.current + extraSeconds),
      });
    },
    [onListened, session.id],
  );

  const handleComplete = React.useCallback(() => {
    listenedRef.current += stretch;
    record(0);
    setStage('done');
    // A sleep session fades away with no bell, so it never wakes anyone.
    if (session.endBell) bell();
    stop(session.endBell ? 4 : 10);
  }, [stretch, record, session.endBell, bell, stop]);

  const player = usePlayer({ durationSeconds: stretch, onComplete: handleComplete });
  const breath = useBreath(session.breathPattern, player.elapsed);

  useWakeLock(player.isPlaying && session.keepScreenOn);

  React.useEffect(() => {
    if (player.isPlaying) void playBed(session.soundscape);
    else if (stage === 'playing') stop(1.2);
  }, [player.isPlaying, stage, session.soundscape, playBed, stop]);

  // Leaving mid-way still counts the time, and the sound never outlives the screen.
  const elapsedRef = React.useRef(0);
  elapsedRef.current = player.elapsed;
  const stageRef = React.useRef(stage);
  stageRef.current = stage;
  React.useEffect(
    () => () => {
      if (stageRef.current === 'playing') record(elapsedRef.current);
      stop(0.4);
    },
    [record, stop],
  );

  const start = () => {
    // Audio may only begin inside the tap itself.
    void prime();
    startedAtRef.current = Date.now();
    listenedRef.current = 0;
    setStretch(session.durationSeconds);
    setStage('playing');
    player.play();
  };

  const togglePause = () => {
    if (!player.isPlaying) void prime();
    player.toggle();
  };

  const end = () => {
    listenedRef.current += player.elapsed;
    record(0);
    player.pause();
    stop(1.5);
    setStage('done');
  };

  const keepGoing = () => {
    void prime();
    setStretch(EXTEND_SECONDS);
    setStage('playing');
    player.play();
  };

  const size = (normal: string, large: string) => (largeText ? large : normal);

  return (
    <div className="relative flex min-h-full flex-col">
      <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
        <button
          type="button"
          onClick={() => (stage === 'playing' ? end() : router.push('/support'))}
          aria-label="Back to support"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-[12px] leading-none text-ink-muted">{session.moment}</p>
        <div className="mt-1.5">
          <LargeTextToggle on={largeText} onToggle={onToggleLargeText} />
        </div>
      </header>

      {stage === 'intro' ? (
        <div className="flex flex-1 flex-col px-7 pb-[clamp(18px,3.8vh,32px)] pt-6">
          {session.review === 'draft' ? <DraftNotice className="mb-5" /> : null}

          <h1
            className={cn(
              'font-bold leading-tight tracking-[-0.02em] text-ink',
              size('text-[24px]', 'text-[29px]'),
            )}
          >
            {session.title}
          </h1>
          <p className={cn('mt-2 text-ink-muted', size('text-[13px]', 'text-[16px]'))}>
            {formatMinutesLabel(session.durationSeconds)}
          </p>

          <div className="mt-6 space-y-3.5">
            {session.intro.map((line) => (
              <p
                key={line}
                className={cn('leading-relaxed text-ink-soft', size('text-[15px]', 'text-[19px]'))}
              >
                {line}
              </p>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <GradientButton
              type="button"
              onClick={start}
              className={cn('w-full gap-2', size('h-14 text-[16px]', 'h-16 text-[19px]'))}
            >
              <Play className="h-5 w-5" strokeWidth={2} />
              Start
            </GradientButton>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-faint">
              {supportDisclaimer.short}
            </p>
          </div>
        </div>
      ) : stage === 'playing' ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-7 py-6">
            <BreathingOrb
              breath={breath}
              isPlaying={player.isPlaying}
              className="h-[min(66vw,34vh,256px)] w-[min(66vw,34vh,256px)]"
            />
            <h1
              className={cn(
                'mt-8 text-center font-semibold leading-tight text-ink',
                size('text-[20px]', 'text-[25px]'),
              )}
            >
              {session.title}
            </h1>
            <p className={cn('mt-2 text-ink-muted', size('text-[13px]', 'text-[16px]'))}>
              {player.isPlaying
                ? `${formatMinutesSeconds(player.remaining)} left`
                : 'Paused. Take all the time you need.'}
            </p>
          </div>

          <div className="px-7 pb-[clamp(18px,3.8vh,32px)]">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={togglePause}
                aria-label={player.isPlaying ? 'Pause' : 'Resume'}
                className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-action-pill text-white shadow-pill transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                {player.isPlaying ? (
                  <Pause className="h-8 w-8" strokeWidth={1.8} />
                ) : (
                  <Play className="h-8 w-8" strokeWidth={1.8} />
                )}
              </button>
            </div>
            <VolumeControl className="mt-6" />
            <button
              type="button"
              onClick={end}
              className={cn(
                'mt-4 w-full py-2 text-center text-ink-muted hover:text-ink',
                size('text-[13px]', 'text-[16px]'),
              )}
            >
              End here
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center px-7 pb-[clamp(18px,3.8vh,32px)]">
          <p
            className={cn(
              'text-center font-medium leading-snug text-ink',
              size('text-[19px]', 'text-[23px]'),
            )}
          >
            {session.closing}
          </p>

          <div className="mt-10 space-y-3">
            {session.keepGoing ? (
              <GradientButton
                type="button"
                onClick={keepGoing}
                className={cn('w-full', size('h-14 text-[15px]', 'h-16 text-[18px]'))}
              >
                Keep going for {Math.round(EXTEND_SECONDS / 60)} more minutes
              </GradientButton>
            ) : null}
            <Link
              href="/support"
              className={cn(
                'flex w-full items-center justify-center rounded-full border border-overlay/25 text-ink transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                size('h-12 text-[14px]', 'h-14 text-[17px]'),
              )}
            >
              Back to support
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
