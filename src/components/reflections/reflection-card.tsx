'use client';

import * as React from 'react';
import { Check, Lock, PencilLine } from 'lucide-react';

import { WeightScale } from '@/components/reflections/weight-scale';
import { GradientButton } from '@/components/shared/gradient-button';
import {
  MAX_REFLECTION_LENGTH,
  promptForDate,
  toDateKey,
  weightLabel,
} from '@/data/reflections';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

/**
 * Today's reflection. One prompt a day, a sentence in reply, and a note of how
 * that sat. Everything is kept on the device — the card says so, because people
 * write differently when they know where it goes.
 */
export function ReflectionCard() {
  const { reflections, saveReflection, hydrated } = useApp();

  // Resolved on the client only: the date key depends on the local clock, and
  // reading it during render would risk a server/client mismatch.
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => setToday(toDateKey(new Date())), []);

  const existing = today ? reflections.find((entry) => entry.date === today) : undefined;

  const [editing, setEditing] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  const [weight, setWeight] = React.useState<number | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const prompt = today ? promptForDate(today) : null;
  const isOpen = editing || (hydrated && Boolean(today) && !existing);

  // Seed the form from the stored entry whenever editing starts.
  React.useEffect(() => {
    if (!editing) return;
    setAnswer(existing?.answer ?? '');
    setWeight(existing?.weight ?? null);
  }, [editing, existing]);

  const handleSave = () => {
    if (!today || !prompt || !answer.trim() || weight === null) return;
    saveReflection({
      date: today,
      promptId: prompt.id,
      prompt: prompt.question,
      answer: answer.trim(),
      weight,
      updatedAt: Date.now(),
    });
    setEditing(false);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  };

  // Placeholder of the same height, so the card does not jump on hydration.
  if (!hydrated || !today || !prompt) {
    return <div className="h-[188px] animate-pulse rounded-tile bg-white/[0.05]" />;
  }

  const canSave = answer.trim().length > 0 && weight !== null;
  const remaining = MAX_REFLECTION_LENGTH - answer.length;

  return (
    <div className="rounded-tile bg-[#141733] p-4">
      <p className="text-[14px] font-medium leading-snug text-ink">{prompt.question}</p>

      {isOpen ? (
        <>
          <label htmlFor="reflection-answer" className="sr-only">
            Your reflection on: {prompt.question}
          </label>
          <textarea
            id="reflection-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value.slice(0, MAX_REFLECTION_LENGTH))}
            rows={3}
            placeholder="A sentence is plenty."
            className={cn(
              'mt-3 w-full resize-none rounded-2xl bg-white/[0.05] px-3.5 py-3 text-[13px] leading-relaxed text-ink',
              'placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            )}
          />

          <div className="mt-1 flex justify-end">
            <span
              className={cn(
                'text-[10.5px] tabular-nums',
                remaining < 40 ? 'text-ink-muted' : 'text-ink-faint',
              )}
            >
              {remaining}
            </span>
          </div>

          <WeightScale value={weight} onChange={setWeight} className="mt-2" />

          <div className="mt-4 flex items-center gap-2.5">
            <GradientButton onClick={handleSave} disabled={!canSave} className="h-11 flex-1">
              Save reflection
            </GradientButton>
            {existing ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-11 rounded-full px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] leading-none text-ink-faint">
            <Lock className="h-3 w-3" strokeWidth={1.8} />
            Kept on this device only
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
            {existing?.answer}
          </p>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] text-ink-soft">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-action-pill" />
              {weightLabel(existing?.weight ?? 3)}
            </span>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <PencilLine className="h-3.5 w-3.5" strokeWidth={1.8} />
              Edit
            </button>
          </div>
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {justSaved ? 'Reflection saved.' : ''}
      </p>

      {justSaved ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-none text-aurora-cyan">
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
          Saved for today.
        </p>
      ) : null}
    </div>
  );
}
