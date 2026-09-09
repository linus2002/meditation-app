'use client';

import * as React from 'react';
import { Check, PencilLine } from 'lucide-react';

import { GradientButton } from '@/components/shared/gradient-button';
import { Skeleton } from '@/components/shared/skeleton';
import { toDateKey } from '@/lib/date';
import { minutesAsleep } from '@/lib/sleep-stats';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

/** 1-5, worded as how rested you felt rather than as a score out of five. */
const QUALITY_LABELS = ['Rough', 'Broken', 'Fair', 'Good', 'Deep'];

const DEFAULT_BEDTIME = '23:00';
const DEFAULT_WAKE = '07:00';

/**
 * Last night, written down.
 *
 * Everything on the sleep screen is derived from these entries, and nothing on
 * it is measured — a phone on a bedside table knows nothing about your sleep.
 * So the card asks only for the three things a person can actually answer, and
 * the screen reports exactly those back.
 */
export function SleepLogCard() {
  const { sleepLogs, saveSleepLog, hydrated } = useApp();

  // Resolved on the client: these pages are prerendered, so the build date must
  // not decide which night "last night" is.
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => setToday(toDateKey(new Date())), []);

  const existing = today ? sleepLogs.find((entry) => entry.date === today) : undefined;

  const [editing, setEditing] = React.useState(false);
  const [bedtime, setBedtime] = React.useState(DEFAULT_BEDTIME);
  const [wakeTime, setWakeTime] = React.useState(DEFAULT_WAKE);
  const [quality, setQuality] = React.useState<number | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const isOpen = editing || (hydrated && Boolean(today) && !existing);

  // Seed the form from the stored night whenever editing starts.
  React.useEffect(() => {
    if (!editing) return;
    setBedtime(existing?.bedtime ?? DEFAULT_BEDTIME);
    setWakeTime(existing?.wakeTime ?? DEFAULT_WAKE);
    setQuality(existing?.quality ?? null);
  }, [editing, existing]);

  const minutes = minutesAsleep(bedtime, wakeTime);
  const duration =
    minutes === null ? null : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

  const handleSave = () => {
    if (!today || quality === null || minutes === null) return;
    saveSleepLog({ date: today, bedtime, wakeTime, quality, updatedAt: Date.now() });
    setEditing(false);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  };

  if (!hydrated) {
    return <Skeleton className="h-[132px]" />;
  }

  if (!isOpen && existing) {
    const slept = minutesAsleep(existing.bedtime, existing.wakeTime) ?? 0;
    return (
      <div className="rounded-tile bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] leading-none text-ink-muted">Last night</p>
            <p className="mt-2 text-[24px] font-light leading-none tracking-[-0.02em] text-ink">
              {Math.floor(slept / 60)}h {String(slept % 60).padStart(2, '0')}m
            </p>
            <p className="mt-2 text-[11.5px] leading-none text-ink-faint">
              {existing.bedtime} – {existing.wakeTime} · {QUALITY_LABELS[existing.quality - 1]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-full bg-overlay/[0.06] px-3 py-1.5 text-[11.5px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <PencilLine className="h-3.5 w-3.5" strokeWidth={1.8} />
            Edit
          </button>
        </div>

        {justSaved ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] leading-none text-ink-muted">
            <Check className="h-3.5 w-3.5 text-aurora-mint" strokeWidth={2.2} />
            Saved to this device.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-tile bg-surface p-4">
      <p className="text-[13.5px] font-medium leading-tight text-ink">How did you sleep?</p>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">
        Everything on this screen comes from what you enter here, and stays on this device.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="block text-[11px] leading-none text-ink-muted">Bedtime</span>
          <input
            type="time"
            value={bedtime}
            onChange={(event) => setBedtime(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-overlay/[0.06] px-3 text-[15px] tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] leading-none text-ink-muted">Woke</span>
          <input
            type="time"
            value={wakeTime}
            onChange={(event) => setWakeTime(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl bg-overlay/[0.06] px-3 text-[15px] tabular-nums text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
        </label>
      </div>

      {duration ? (
        <p className="mt-2.5 text-[11.5px] leading-none text-ink-faint">
          That is {duration} in bed.
        </p>
      ) : null}

      <p id="sleep-quality-label" className="mt-4 text-[11.5px] leading-none text-ink-muted">
        How rested did you feel?
      </p>
      <div
        role="radiogroup"
        aria-labelledby="sleep-quality-label"
        className="mt-2.5 flex items-center justify-between gap-1"
      >
        {QUALITY_LABELS.map((word, index) => {
          const score = index + 1;
          const selected = quality === score;
          return (
            <button
              key={word}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={word}
              tabIndex={selected || (quality === null && index === 0) ? 0 : -1}
              onClick={() => setQuality(score)}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <span
                className={cn(
                  'h-3.5 w-3.5 rounded-full transition-all duration-150',
                  selected ? 'scale-110 bg-action-pill' : 'bg-overlay/15 group-hover:bg-overlay/30',
                )}
              />
              <span
                className={cn(
                  'text-[9.5px] leading-none transition-colors',
                  selected ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {word}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <GradientButton
          onClick={handleSave}
          disabled={quality === null || minutes === null}
          className="h-11 flex-1 text-[13px]"
        >
          {existing ? 'Update night' : 'Save night'}
        </GradientButton>
        {existing ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="h-11 rounded-full px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
