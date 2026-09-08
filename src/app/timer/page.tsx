'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsLeft, Pause, Play, Square } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SessionComplete } from '@/components/session/session-complete';
import { GradientButton } from '@/components/shared/gradient-button';
import { EdgeCurves, WaveLines } from '@/components/shared/decor';
import { OptionRow } from '@/components/timer/option-row';
import { TimerRing } from '@/components/timer/timer-ring';
import { suggestNext } from '@/data/meditations';
import {
  DEFAULT_TIMER_MINUTES,
  INTERVAL_OPTIONS,
  TIMER_PRESETS,
  TIMER_SOUNDSCAPES,
  UNGUIDED_ID,
  WARMUP_OPTIONS,
} from '@/data/timer';
import { useCountdown } from '@/hooks/use-countdown';
import { useSessionRecorder } from '@/hooks/use-session-recorder';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { soundscapes, type SoundscapeId } from '@/lib/audio/soundscapes';
import { formatClock } from '@/lib/format';
import { useAudio } from '@/providers/audio-provider';

type Phase = 'setup' | 'warmup' | 'running' | 'done';

const soundOptions = TIMER_SOUNDSCAPES.map((id) => ({
  value: id,
  label: id ? soundscapes[id].name : 'Silence',
}));

const presetOptions = TIMER_PRESETS.map((minutes) => ({
  value: minutes,
  label: `${minutes}`,
}));

export default function TimerPage() {
  const router = useRouter();
  const { bell, play, stop, prime } = useAudio();

  const [phase, setPhase] = React.useState<Phase>('setup');
  const [minutes, setMinutes] = React.useState<number>(DEFAULT_TIMER_MINUTES);
  const [intervalMinutes, setIntervalMinutes] = React.useState<number>(0);
  const [warmupSeconds, setWarmupSeconds] = React.useState<number>(0);
  const [scape, setScape] = React.useState<SoundscapeId | null>(null);

  const recorder = useSessionRecorder(UNGUIDED_ID);
  const lastBellRef = React.useRef(0);

  const phaseRef = React.useRef<Phase>(phase);
  phaseRef.current = phase;

  const totalSeconds = minutes * 60;

  const handleComplete = React.useCallback(() => {
    if (phaseRef.current === 'warmup') {
      setPhase('running');
      return;
    }
    if (phaseRef.current !== 'running') return;

    recorder.elapsedRef.current = totalSeconds;
    recorder.markFinished();
    recorder.commit(true);
    bell(392);
    stop(4);
    setPhase('done');
  }, [recorder, totalSeconds, bell, stop]);

  const countdown = useCountdown({ seconds: totalSeconds, onComplete: handleComplete });
  const { reset, start } = countdown;

  // Each phase re-arms the clock with its own length.
  React.useEffect(() => {
    if (phase === 'warmup') {
      reset(warmupSeconds);
      start();
    } else if (phase === 'running') {
      lastBellRef.current = 0;
      recorder.restart();
      reset(totalSeconds);
      start();
      bell(523.25);
    }
    // Re-arming is driven by the phase alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Keep the recorder in step, and strike the interval bells.
  const elapsed = phase === 'running' ? totalSeconds - countdown.remaining : 0;
  if (phase === 'running') recorder.elapsedRef.current = elapsed;

  React.useEffect(() => {
    if (phase !== 'running' || intervalMinutes <= 0) return;
    const index = Math.floor(elapsed / (intervalMinutes * 60));
    if (index > lastBellRef.current && countdown.remaining > 2) {
      lastBellRef.current = index;
      bell(659.25);
    }
  }, [elapsed, phase, intervalMinutes, countdown.remaining, bell]);

  // The screen stays lit while a sit is under way.
  useWakeLock(phase === 'warmup' || phase === 'running');

  const begin = async () => {
    // Audio has to be unlocked by the gesture that starts the sit.
    await prime();
    if (scape) void play(scape);
    setPhase(warmupSeconds > 0 ? 'warmup' : 'running');
  };

  const endEarly = () => {
    recorder.commit(false);
    stop(1.5);
    countdown.reset(totalSeconds);
    setPhase('setup');
  };

  const isSitting = phase === 'warmup' || phase === 'running';

  return (
    <div className="relative flex min-h-full flex-col">
      <WaveLines className="left-0 top-0 h-[260px] w-full" />
      <EdgeCurves className="-right-4 top-[34%] h-[320px] w-[110px]" />

      {isSitting ? (
        <header className="relative flex items-center px-4 pt-[clamp(12px,2.4vh,20px)]">
          <button
            type="button"
            onClick={endEarly}
            aria-label="End sit"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ChevronsLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>
      ) : (
        <ScreenHeader
          eyebrow="Sit without guidance"
          title="Timer"
          className="pt-[clamp(20px,5.7vh,48px)]"
        />
      )}

      {isSitting ? (
        <div className="relative flex flex-1 flex-col items-center justify-center px-7 py-6">
          <TimerRing
            progress={phase === 'warmup' ? 0 : countdown.progress}
            className="h-[min(66vw,34vh,260px)] w-[min(66vw,34vh,260px)]"
          >
            <p className="text-[clamp(30px,10vw,40px)] font-light leading-none tabular-nums tracking-[-0.02em] text-ink">
              {formatClock(Math.ceil(countdown.remaining))}
            </p>
            <p className="mt-2 text-[11.5px] leading-none text-ink-muted">
              {phase === 'warmup' ? 'Settling' : `of ${minutes} min`}
            </p>
          </TimerRing>

          <div className="mt-[clamp(24px,5vh,44px)] flex items-center gap-4">
            <button
              type="button"
              onClick={() => (countdown.running ? countdown.pause() : countdown.resume())}
              aria-label={countdown.running ? 'Pause sit' : 'Resume sit'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-canvas-deep transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {countdown.running ? (
                <Pause className="h-6 w-6 fill-canvas-deep" />
              ) : (
                <Play className="h-6 w-6 translate-x-[2px] fill-canvas-deep" />
              )}
            </button>

            <button
              type="button"
              onClick={endEarly}
              aria-label="End sit"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-ink-muted transition-colors hover:border-white/35 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Square className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {intervalMinutes > 0 ? (
            <p className="mt-5 text-[11px] leading-none text-ink-faint">
              Bell every {intervalMinutes} min
            </p>
          ) : null}
        </div>
      ) : phase === 'done' ? (
        <div className="relative flex-1 px-5 pb-[clamp(18px,3.8vh,32px)] pt-6">
          <SessionComplete
            minutes={minutes}
            againLabel="Sit again"
            onAgain={() => setPhase(warmupSeconds > 0 ? 'warmup' : 'running')}
            nextUp={suggestNext(undefined, 'breathing')}
          />
        </div>
      ) : (
        <div className="relative flex-1 px-5 pb-[clamp(18px,3.8vh,32px)] pt-6">
          <div className="text-center">
            <p className="text-[clamp(56px,18vw,72px)] font-light leading-none tabular-nums tracking-[-0.03em] text-ink">
              {minutes}
            </p>
            <p className="mt-1.5 text-[12px] leading-none text-ink-muted">minutes</p>
          </div>

          <OptionRow
            label="Length"
            options={presetOptions}
            value={minutes}
            onChange={setMinutes}
            scroll
            className="mt-6"
          />

          <OptionRow
            label="Interval bells"
            options={INTERVAL_OPTIONS}
            value={intervalMinutes}
            onChange={setIntervalMinutes}
            className="mt-5"
          />

          <OptionRow
            label="Settle first"
            options={WARMUP_OPTIONS}
            value={warmupSeconds}
            onChange={setWarmupSeconds}
            className="mt-5"
          />

          <OptionRow
            label="Ambience"
            options={soundOptions}
            value={scape}
            onChange={setScape}
            scroll
            className="mt-5"
          />

          <GradientButton onClick={begin} className="mt-7 h-[clamp(52px,7.2vh,58px)] w-full">
            Begin
          </GradientButton>

          <button
            type="button"
            onClick={() => router.push('/activities')}
            className="mt-3 w-full rounded-full py-2 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            See your progress
          </button>
        </div>
      )}
    </div>
  );
}
