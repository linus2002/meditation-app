'use client';

import * as React from 'react';
import { ChevronsLeft, Pause, Play, SkipForward, X } from 'lucide-react';

import { EndSessionPrompt } from '@/components/session/end-session-prompt';
import { SessionComplete } from '@/components/session/session-complete';
import { TimerRing } from '@/components/timer/timer-ring';
import { yogaColor } from '@/components/yoga/yoga-glass-tile';
import { YOGA_SAFETY, type YogaSession } from '@/data/yoga';
import { useBack } from '@/hooks/use-back';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { useYogaSession } from '@/hooks/use-yoga-session';
import { useYogaVoice } from '@/hooks/use-yoga-voice';
import { formatClock, formatMinutesLabel } from '@/lib/format';
import { elapsedAt, poseLines, poseSideLabel, poseTitle, totalSeconds } from '@/lib/yoga';
import { useApp } from '@/providers/app-provider';
import { useAudio } from '@/providers/audio-provider';

type Phase = 'intro' | 'running' | 'done';

const iconButton =
  'tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/**
 * A guided yoga session: an overview to decide, then one pose at a time — its
 * name, one instruction, a countdown ring and what comes next — with a soft
 * bell as each pose begins. Time spent counts toward the day like any sit.
 *
 * An instructor's voice guides it for eyes that are closed: just before a pose
 * ends it says what is next, and as each pose begins it reads the instruction.
 * A pose that was not announced (the first, or one skipped to) is named first.
 */
export function YogaPlayer({ session }: { session: YogaSession }) {
  // The session's own colour, as on its tile, tints the top of this page.
  const color = yogaColor(session.id);
  const goBack = useBack();
  const { settings } = useApp();
  const { bell, play, stop, prime } = useAudio();

  const [phase, setPhase] = React.useState<Phase>('intro');
  const recorder = useSessionRecorder(session.id);
  const total = totalSeconds(session.poses);

  const voice = useYogaVoice();
  // The pose the instructor has just said "Next, …" for.
  const announcedRef = React.useRef(-1);
  const linesFor = (index: number) =>
    poseLines(session.poses[index], index === session.poses.length - 1);

  const clock = useYogaSession(session.poses, {
    onPoseStart: (index) => {
      // A clear bell to begin, a lighter one for each change of pose.
      bell(index === 0 ? 523.25 : 659.25);
      const recorded = session.poses[index].voice;
      const lines = linesFor(index);
      const cue = { src: recorded?.cue, text: lines.cue };
      if (announcedRef.current === index) voice.say(cue);
      else voice.say({ src: recorded?.name, text: lines.name }, cue);
    },
    onPoseEnding: (index) => {
      const upcoming = index + 1;
      if (upcoming >= session.poses.length) return;
      announcedRef.current = upcoming;
      voice.say({ src: session.poses[upcoming].voice?.next, text: linesFor(upcoming).next });
    },
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
    announcedRef.current = -1;
    setPhase('running');
    clock.begin();
  };

  const endEarly = () => {
    setConfirmingEnd(false);
    recorder.commit(false);
    clock.stop();
    voice.stop();
    stop(1.2);
    setPhase('intro');
  };

  const pause = () => {
    voice.stop();
    clock.pause();
  };

  // Ending is asked, not done: the corner button sits where Back usually is.
  const [confirmingEnd, setConfirmingEnd] = React.useState(false);
  const wasRunningRef = React.useRef(false);
  const askToEnd = () => {
    wasRunningRef.current = clock.running;
    pause();
    setConfirmingEnd(true);
  };
  const keepGoing = () => {
    setConfirmingEnd(false);
    if (wasRunningRef.current) clock.resume();
  };

  if (phase === 'running' && pose) {
    return (
      <div className="relative flex min-h-full flex-col">
        <header className="relative flex items-center justify-between px-4 pt-[calc(var(--header-gap)-8px)]">
          <button type="button" onClick={askToEnd} aria-label="End session" className={iconButton}>
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <p className="text-caption leading-none text-ink-muted">
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
            <p className="text-[clamp(1.75rem,9vw,2.25rem)] font-light leading-none tabular-nums tracking-[-0.02em] text-ink">
              {formatClock(Math.ceil(clock.remaining))}
            </p>
            {pose.side ? (
              <p className="mt-2 text-label leading-none text-ink-muted">
                {poseSideLabel(pose.side)}
              </p>
            ) : null}
          </TimerRing>

          <h1
            aria-live="polite"
            className="mt-[clamp(18px,4vh,32px)] text-[clamp(1.375rem,7vw,1.75rem)] font-bold leading-tight tracking-[-0.02em] text-ink"
          >
            {pose.name}
          </h1>
          <p className="mt-2 max-w-[310px] text-body-sm leading-relaxed text-ink-muted">
            {pose.cue}
          </p>
          <p className="mt-4 text-caption leading-none text-ink-faint">
            {next ? `Next: ${poseTitle(next)}` : 'Last pose'}
          </p>

          <div className="mt-[clamp(20px,4vh,36px)] flex items-center gap-4">
            <button
              type="button"
              onClick={() => (clock.running ? pause() : clock.resume())}
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

        <EndSessionPrompt
          open={confirmingEnd}
          secondsSoFar={elapsed}
          onKeepGoing={keepGoing}
          onEnd={endEarly}
        />
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="relative flex min-h-full flex-col">
        <header className="relative flex items-center px-4 pt-[calc(var(--header-gap)-8px)]">
          <button type="button" onClick={goBack} aria-label="Go back" className={iconButton}>
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
      {/*
       * The session's own colour, as on its tile, filling the top half of the
       * screen at full strength and fading into the page by the title.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[54vh]"
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color} 30%, ${color}a6 58%, ${color}33 82%, rgb(var(--canvas)) 100%)`,
        }}
      />

      {/* Always dark: it sits on the colour at full strength in either theme. */}
      <header className="relative flex items-center justify-between px-4 pt-[calc(var(--header-gap)-8px)]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="tap-target flex h-9 w-9 items-center justify-center rounded-full text-black/70 transition-colors hover:bg-black/[0.06] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-caption font-medium leading-none text-black/75">Yoga · {session.focus}</p>
        <span className="h-9 w-9" />
      </header>

      {/* The title sits where the colour fades out, so it reads in both themes. */}
      <div className="relative flex min-h-[calc(50vh-56px)] shrink-0 flex-col justify-end px-5">
        <h1 className="text-[clamp(1.375rem,7vw,1.625rem)] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {session.title}
        </h1>
        <p className="mt-1 text-body-sm leading-snug text-ink-muted">{session.subtitle}</p>
        <p className="mt-3 text-caption leading-none text-ink-soft">
          {formatMinutesLabel(total)} · {session.level} · {session.poses.length} poses
        </p>
      </div>

      <div className="relative px-5">
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">{session.description}</p>

        <button
          type="button"
          onClick={() => void begin()}
          className="mt-5 h-12 w-full rounded-full border border-black/10 bg-white text-body-sm font-medium text-black transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Start
        </button>

        <h2 className="mt-7 text-[0.9375rem] font-medium leading-none text-ink-soft">The poses</h2>
        <ol className="mt-3 space-y-1.5">
          {session.poses.map((item, index) => (
            <li
              key={`${item.name}-${item.side ?? 'both'}-${index}`}
              className="flex items-baseline justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5"
            >
              <span className="min-w-0 text-body-sm leading-snug text-ink">
                <span className="text-ink-faint">{index + 1}. </span>
                {poseTitle(item)}
              </span>
              <span className="shrink-0 text-label tabular-nums text-ink-faint">
                {formatClock(item.seconds)}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-tile bg-surface px-4 py-3 text-label leading-relaxed text-ink-muted">
          {YOGA_SAFETY}
        </p>
      </div>
    </div>
  );
}
