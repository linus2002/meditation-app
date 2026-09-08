'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

const PRESETS = [5, 10, 15, 30, 60];

/**
 * A wind-down countdown. Like the session player it measures wall-clock time
 * rather than counting ticks, so a backgrounded tab stays accurate.
 */
export function SleepTimer({ onComplete }: { onComplete?: () => void }) {
  const [minutes, setMinutes] = React.useState(15);
  const [remaining, setRemaining] = React.useState(15 * 60);
  const [running, setRunning] = React.useState(false);
  const deadlineRef = React.useRef(0);
  const completeRef = React.useRef(onComplete);

  React.useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    if (!running) return undefined;

    deadlineRef.current = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        completeRef.current?.();
      }
    }, 250);

    return () => window.clearInterval(id);
    // `remaining` is intentionally read once per start rather than tracked here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const choosePreset = (value: number) => {
    setRunning(false);
    setMinutes(value);
    setRemaining(value * 60);
  };

  const total = minutes * 60;
  const elapsed = total - remaining;

  return (
    <div className="rounded-tile bg-[#141733] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] leading-none text-ink-muted">Wind down timer</p>
          <p className="mt-2 text-[34px] font-light leading-none tabular-nums tracking-[-0.02em] text-ink">
            {formatClock(remaining)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => choosePreset(minutes)}
            aria-label="Reset timer"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={() => setRunning((current) => !current)}
            disabled={remaining === 0}
            aria-label={running ? 'Pause timer' : 'Start timer'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-canvas-deep transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {running ? (
              <Pause className="h-[18px] w-[18px] fill-canvas-deep" />
            ) : (
              <Play className="h-[18px] w-[18px] translate-x-[1px] fill-canvas-deep" />
            )}
          </button>
        </div>
      </div>

      <Progress value={total > 0 ? (elapsed / total) * 100 : 0} className="mt-4" />

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => choosePreset(preset)}
            aria-pressed={minutes === preset}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              minutes === preset
                ? 'bg-action-pill text-white'
                : 'bg-white/[0.06] text-ink-muted hover:text-ink',
            )}
          >
            {preset} min
          </button>
        ))}
      </div>
    </div>
  );
}
