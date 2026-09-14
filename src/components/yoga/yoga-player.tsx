'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronsLeft, Pause, Play, SkipForward } from 'lucide-react';

import { SessionComplete } from '@/components/session/session-complete';
import { GradientButton } from '@/components/shared/gradient-button';
import { TimerRing } from '@/components/timer/timer-ring';
import { YOGA_SAFETY, type YogaSession } from '@/data/yoga';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useYogaSession } from '@/hooks/use-yoga-session';
import { formatClock, formatMinutesLabel } from '@/lib/format';
import { elapsedAt, poseSideLabel, poseTitle, totalSeconds } from '@/lib/yoga';
import { useApp } from '@/providers/app-provider';
import { useAudio } from '@/providers/audio-provider';

type Phase = 'intro' | 'running' | 'done';

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/**
 * A guided yoga session: an overview to decide, then one pose at a time — its
 * name, one instruction, a countdown ring and what comes next — with a soft
 * bell as each pose begins. Time spent counts toward the day like any sit.
 */
export function YogaPlayer({ session }: { session: YogaSession }) {
  const router = useRouter();
  const { settings } = useApp();
  const { bell, play, stop, prime } = useAudio();

  const [phase, setPhase] = React.useState<Phase>('intro');
  const recorder = useSessionRecorder(session.id);
  const total = totalSeconds(session.poses);

  const clock = useYogaSession(session.poses, {
    // A clear bell to begin, a lighter one for each change of pose.
    onPoseStart: (index) => bell(index === 0 ? 523.25 : 659.25),
    onFinish: () => {
      recorder.elapsedRef.current = total;
      recorder.markFinished();
      recorder.commit(true);
      bell(392);
      stop(4);
      setPhase('done');
    },
  });

  const pose = session.poses[clock.index];
  const next = session.poses[clock.index + 1];
  const elapsed =
    phase === 'running' ? elapsedAt(session.poses, clock.index, clock.remaining) : 0;
  if (phase === 'running') recorder.elapsedRef.current = elapsed;

  useWakeLock(phase === 'running');
  React.useEffect(() => () => stop(0.4), [stop]);

  const begin = async () => {
    // Audio may only start inside the tap that begins the session.
    await prime();
    if (settings.ambient ?? true) void play(session.soundscape);
    recorder.restart();
    setPhase('running');
    clock.begin();
  };

  const endEarly = () => {
    recorder.commit(false);
    clock.stop();
    stop(1.2);
    setPhase('intro');
  };

  if (phase === 'running' && pose) {
    return (
      <div className="relative flex min-h-full flex-col">
        <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
          <button type="button" onClick={endEarly} aria-label="End session" className={iconButton}>
            <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <p className="text-[12px] leading-none text-ink-muted">
            Pose {clock.index + 1} of {session.poses.length}
          </p>
          <span className="h-9 w-9" />
        </header>

        <div
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.round(elapsed)}
          className="mx-5 mt-3 h-1 overflow-hidden rounded-full bg-overlay/[0.08]"
        >
          <div
            className="h-full rounded-full bg-action-pill transition-[width] duration-300 ease-linear"
            style={{ width: `${total > 0 ? (elapsed / total) * 100 : 0}%` }}
          />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-7 py-6 text-center">
          <TimerRing
            progress={pose.seconds > 0 ? 1 - clock.remaining / pose.seconds : 1}
            className="h-[min(56vw,30vh,220px)] w-[min(56vw,30vh,220px)]"
          >
            <p className="text-[clamp(28px,9vw,36px)] font-light leading-none tabular-nums tracking-[-0.02em] text-ink">
              {formatClock(Math.ceil(clock.remaining))}
            </p>
            {pose.side ? (
              <p className="mt-2 text-[11.5px] leading-none text-ink-muted">
                {poseSideLabel(pose.side)}
              </p>
            ) : null}
          </TimerRing>

          <h1
            aria-live="polite"
            className="mt-[clamp(18px,4vh,32px)] text-[clamp(22px,7vw,28px)] font-bold leading-tight tracking-[-0.02em] text-ink"
          >
            {pose.name}
          </h1>
          <p className="mt-2 max-w-[310px] text-[13.5px] leading-relaxed text-ink-muted">
            {pose.cue}
          </p>
          <p className="mt-4 text-[12px] leading-none text-ink-faint">
            {next ? `Next: ${poseTitle(next)}` : 'Last pose'}
          </p>

          <div className="mt-[clamp(20px,4vh,36px)] flex items-center gap-4">
            <button
              type="button"
              onClick={() => (clock.running ? clock.pause() : clock.resume())}
              aria-label={clock.running ? 'Pause' : 'Resume'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-canvas transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              {clock.running ? (
                <Pause className="h-6 w-6 fill-canvas-deep" />
              ) : (
                <Play className="h-6 w-6 translate-x-[2px] fill-canvas-deep" />
              )}
            </button>
            <button
              type="button"
              onClick={clock.skip}
              aria-label={next ? 'Next pose' : 'Finish'}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-overlay/15 text-ink-muted transition-colors hover:border-overlay/35 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <SkipForward className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="relative flex min-h-full flex-col">
        <header className="relative flex items-center px-4 pt-[clamp(12px,2.4vh,20px)]">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className={iconButton}>
            <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>
        <div className="relative flex-1 px-5 pb-[clamp(18px,3.8vh,32px)] pt-4">
          <SessionComplete
            minutes={Math.max(1, Math.round(total / 60))}
            againLabel="Flow again"
            onAgain={() => void begin()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col pb-6">
      <header className="relative flex items-center justify-between px-4 pt-[clamp(12px,2.4vh,20px)]">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className={iconButton}>
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-[12px] leading-none text-ink-muted">Yoga · {session.focus}</p>
        <span className="h-9 w-9" />
      </header>

      <div className="relative mx-5 mt-3 aspect-[16/10] overflow-hidden rounded-[16px]">
        <Image
          src={session.image}
          alt={session.imageAlt}
          fill
          sizes="(max-width: 430px) 90vw, 390px"
          placeholder="blur"
          priority
          className="object-cover"
        />
      </div>

      <div className="px-5">
        <h1 className="mt-5 text-[clamp(22px,7vw,26px)] font-bold leading-tight tracking-[-0.02em] text-ink">
          {session.title}
        </h1>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{session.subtitle}</p>
        <p className="mt-3 text-[12px] leading-none text-ink-soft">
          {formatMinutesLabel(total)} · {session.level} · {session.poses.length} poses
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{session.description}</p>

        <GradientButton
          type="button"
          onClick={() => void begin()}
          className="mt-5 h-12 w-full gap-2 text-[14px]"
        >
          <Play className="h-4 w-4 fill-white" />
          Begin
        </GradientButton>

        <h2 className="mt-7 text-[15px] font-medium leading-none text-ink-soft">The poses</h2>
        <ol className="mt-3 space-y-1.5">
          {session.poses.map((item, index) => (
            <li
              key={`${item.name}-${item.side ?? 'both'}-${index}`}
              className="flex items-baseline justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5"
            >
              <span className="min-w-0 text-[13px] leading-snug text-ink">
                <span className="text-ink-faint">{index + 1}. </span>
                {poseTitle(item)}
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-ink-faint">
                {formatClock(item.seconds)}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-tile bg-surface px-4 py-3 text-[11.5px] leading-relaxed text-ink-muted">
          {YOGA_SAFETY}
        </p>
      </div>
    </div>
  );
}
