'use client';

import * as React from 'react';

import { MoodScale } from '@/components/mood/mood-scale';
import { moodLabel } from '@/data/moods';
import { toDateKey } from '@/lib/date';
import { newPairId } from '@/lib/moods';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

/**
 * One id per sitting, joining the mood given before it to the one given
 * after. Sitting again starts a new pair.
 */
export function useSitMood(): { pairId: string; renew: () => void } {
  const [pairId, setPairId] = React.useState(() => newPairId());
  const renew = React.useCallback(() => setPairId(newPairId()), []);
  return { pairId, renew };
}

interface SitMoodProps {
  pairId: string;
  meditationId?: string;
  className?: string;
}

function useSideOf(pairId: string, side: 'before' | 'after', meditationId?: string) {
  const { moods, logMood } = useApp();
  const id = `${pairId}:${side}`;
  const entry = moods.find((item) => item.id === id);
  const save = (score: number) => {
    const now = new Date();
    logMood({ id, date: toDateKey(now), at: now.getTime(), score, context: side, pairId, meditationId });
  };
  return { entry, save, moods };
}

/** Before the sitting: optional, small, and gone once it starts. */
export function BeforeMood({ pairId, meditationId, className }: SitMoodProps) {
  const { entry, save } = useSideOf(pairId, 'before', meditationId);
  return (
    <div className={cn('rounded-tile bg-overlay/[0.05] px-3.5 py-3 backdrop-blur-md', className)}>
      <p className="text-label leading-none text-ink-muted">
        How are you feeling right now? <span className="text-ink-faint">Optional</span>
      </p>
      <MoodScale
        value={entry?.score ?? null}
        onChange={save}
        label="How are you feeling before you start?"
        hideLabel
        compact
        className="mt-2"
      />
    </div>
  );
}

/** After the sitting, next to how it went. Shows the change when both were given. */
export function AfterMood({ pairId, meditationId, className }: SitMoodProps) {
  const { entry, save, moods } = useSideOf(pairId, 'after', meditationId);
  const before = moods.find((item) => item.id === `${pairId}:before`);

  let note = 'Only you ever see this.';
  if (before && entry) {
    const change = entry.score - before.score;
    note =
      change > 0
        ? `You came in feeling ${moodLabel(before.score).toLowerCase()}, and now feel ${moodLabel(entry.score).toLowerCase()}.`
        : change === 0
          ? `About the same as before. Some days that’s what a sit gives, and that’s fine.`
          : `A little lower than before. That happens; noticing it is part of the practice.`;
  } else if (before) {
    note = `Before, you said ${moodLabel(before.score).toLowerCase()}.`;
  }

  return (
    <div className={cn('rounded-tile bg-surface p-4', className)}>
      <p className="text-caption font-medium leading-tight text-ink">How do you feel now?</p>
      <p className="mt-0.5 text-label leading-tight text-ink-faint" role={entry ? 'status' : undefined}>
        {note}
      </p>
      <MoodScale
        value={entry?.score ?? null}
        onChange={save}
        label="How do you feel now?"
        hideLabel
        className="mt-3"
      />
    </div>
  );
}
