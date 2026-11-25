'use client';

import * as React from 'react';
import { Pause, Play, Square } from 'lucide-react';

import type { Practice } from '@/data/kapwa-knowledge';
import { tr, type KapwaLanguage } from '@/lib/kapwa-i18n';
import { planSeconds, runnerAt, runnerPlan } from '@/lib/kapwa-runner';
import { cn } from '@/lib/utils';

/** The breathing circle grows on an in-breath, shrinks on an out-breath, and holds its size on a hold. */
function breathScale(plan: { text: string }[], index: number): string {
  for (let i = index; i >= 0; i--) {
    const text = plan[i].text.toLowerCase();
    if (/\bbreathe? in\b|\bin through\b|\binhale\b/.test(text)) return 'scale-110';
    if (/\bbreathe? out\b|\bout through\b|\bexhale\b/.test(text)) return 'scale-75';
  }
  return 'scale-100';
}

/**
 * A practice from Kapwa, guided in time: one instruction at a time with its
 * countdown, the whole run's progress, and Pause and Stop. Timing follows the
 * clock, not ticks, so it stays right if the phone was busy or the screen
 * dimmed. A light vibration marks each new step where the phone supports it.
 */
export function PracticeRunner({
  practice,
  lang = 'en',
  onFinish,
}: {
  practice: Practice;
  /** The language to show the steps in. The breathing circle follows the English, so it can't drift. */
  lang?: KapwaLanguage;
  /** Called once: `completed` when it ran to the end, otherwise stopped early. */
  onFinish: (completed: boolean) => void;
}) {
  const plan = React.useMemo(() => runnerPlan(practice), [practice]);
  const total = planSeconds(plan);
  const [elapsed, setElapsed] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const started = React.useRef(performance.now());
  const pausedFor = React.useRef(0);
  const pausedAt = React.useRef<number | null>(null);
  const finished = React.useRef(false);

  const finish = React.useCallback(
    (completed: boolean) => {
      if (finished.current) return;
      finished.current = true;
      onFinish(completed);
    },
    [onFinish],
  );

  React.useEffect(() => {
    if (paused) return;
    const tick = window.setInterval(() => {
      const seconds = (performance.now() - started.current - pausedFor.current) / 1000;
      setElapsed(seconds);
      if (seconds >= total) finish(true);
    }, 200);
    return () => window.clearInterval(tick);
  }, [paused, total, finish]);

  const { index, stepLeft } = runnerAt(plan, elapsed);
  const step = plan[index];

  // A small buzz on each new step, so eyes can stay closed.
  const lastIndex = React.useRef(0);
  React.useEffect(() => {
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      try {
        navigator.vibrate?.(25);
      } catch {
        // Not supported: the text still changes.
      }
    }
  }, [index]);

  const togglePause = () => {
    if (paused) {
      pausedFor.current += performance.now() - (pausedAt.current ?? performance.now());
      pausedAt.current = null;
      setPaused(false);
    } else {
      pausedAt.current = performance.now();
      setPaused(true);
    }
  };

  const left = Math.max(0, Math.ceil(total - elapsed));
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const title = tr(lang, practice.title);
  const leftLabel = tr(lang, '{clock} left', { clock });

  return (
    <section aria-label={tr(lang, '{title}, guided', { title })} className="mx-4 rounded-3xl bg-surface p-5 shadow-pill">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body-sm font-semibold text-ink">{title}</h2>
        <span className="text-caption tabular-nums text-ink-muted" aria-label={leftLabel}>
          {leftLabel}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {step.breath ? (
          <span
            aria-hidden="true"
            className={cn(
              'h-14 w-14 shrink-0 rounded-full bg-aurora-blue/25 transition-transform ease-in-out motion-reduce:transition-none',
              breathScale(plan, index),
            )}
            style={{ transitionDuration: `${step.seconds}s` }}
          />
        ) : null}
        <p aria-live="polite" className="min-h-[3.5rem] text-body leading-relaxed text-ink">
          {tr(lang, step.text)}
        </p>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-overlay/10" aria-hidden="true">
        <div className="h-full rounded-full bg-aurora-blue transition-[width] duration-200" style={{ width: `${(elapsed / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-caption tabular-nums text-ink-muted">
        {tr(lang, 'Step {step} of {steps} · {seconds} s', { step: index + 1, steps: plan.length, seconds: Math.ceil(stepLeft) })}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={togglePause}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-overlay/[0.08] text-body-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          {tr(lang, paused ? 'Resume' : 'Pause')}
        </button>
        <button
          type="button"
          onClick={() => finish(false)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-overlay/[0.08] text-body-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Square className="h-4 w-4" aria-hidden="true" />
          {tr(lang, 'Stop')}
        </button>
      </div>
    </section>
  );
}
