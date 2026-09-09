'use client';

import * as React from 'react';
import { NotebookPen, Trash2 } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SectionTitle } from '@/components/shared/section-title';
import { formatEntryDate, reflectionWeights, weightLabel } from '@/data/reflections';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

export default function ReflectionsPage() {
  const { reflections, removeReflection, hydrated } = useApp();

  // Only meaningful once there is something to compare against.
  const average =
    reflections.length > 0
      ? reflections.reduce((total, entry) => total + entry.weight, 0) / reflections.length
      : null;

  return (
    <div className="pb-4">
      <ScreenHeader
        eyebrow={reflections.length === 1 ? '1 entry' : `${reflections.length} entries`}
        title="Reflections"
      />

      {hydrated && reflections.length >= 3 ? (
        <section className="mt-6 px-5">
          <div className="rounded-tile bg-surface p-4">
            <p className="text-[11px] leading-none text-ink-muted">Recently, most days felt</p>
            <p className="mt-2 text-[22px] font-light leading-none tracking-[-0.02em] text-ink">
              {weightLabel(Math.round(average ?? 3))}
            </p>

            {/* Last fourteen entries, oldest on the left. */}
            <div className="mt-4 flex h-[52px] items-end gap-1.5" aria-hidden="false">
              {[...reflections]
                .slice(0, 14)
                .reverse()
                .map((entry) => (
                  <div key={entry.date} className="flex h-full w-[11px] shrink-0 items-end">
                    <div
                      role="img"
                      aria-label={`${formatEntryDate(entry.date)}: ${weightLabel(entry.weight)}`}
                      className="w-full rounded-full bg-[linear-gradient(180deg,#B96BF0_0%,#8A7AF2_45%,#2FE0CB_100%)]"
                      style={{ height: `${(entry.weight / reflectionWeights.length) * 100}%` }}
                    />
                  </div>
                ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-none text-ink-faint">
              Taller is lighter. This is a record, not a score.
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-6 px-5">
        <SectionTitle actionHref="/home" actionLabel="Write today">
          Past Entries
        </SectionTitle>

        {!hydrated ? (
          <ul className="mt-3 space-y-2.5">
            {[0, 1, 2].map((index) => (
              <li key={index} className="h-[96px] animate-pulse rounded-tile bg-overlay/[0.05]" />
            ))}
          </ul>
        ) : reflections.length === 0 ? (
          <div className="mt-3 rounded-tile bg-surface px-4 py-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-overlay/[0.06]">
              <NotebookPen className="h-5 w-5 text-ink-soft" strokeWidth={1.6} />
            </span>
            <p className="mt-3.5 text-[13.5px] font-medium text-ink">Nothing written yet</p>
            <p className="mx-auto mt-1.5 max-w-[240px] text-[11.5px] leading-relaxed text-ink-muted">
              There is a new prompt on the home screen each day. A sentence is plenty.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {reflections.map((entry) => (
              <li key={entry.date} className="rounded-tile bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] font-medium leading-none text-ink">
                    {formatEntryDate(entry.date)}
                  </p>
                  <span className="text-[11px] leading-none text-ink-muted">
                    {weightLabel(entry.weight)}
                  </span>
                </div>

                <p className="mt-2.5 text-[11.5px] leading-snug text-ink-faint">{entry.prompt}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                  {entry.answer}
                </p>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeReflection(entry.date)}
                    aria-label={`Delete the reflection from ${formatEntryDate(entry.date)}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] text-ink-faint',
                      'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
