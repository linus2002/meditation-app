'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, NotebookPen } from 'lucide-react';

import { Skeleton } from '@/components/shared/skeleton';
import { promptForDate, toDateKey } from '@/data/reflections';
import { useApp } from '@/providers/app-provider';

/**
 * The day's prompt on the home screen, as a link rather than a form.
 *
 * The full card used to sit here, which put a textarea, a scale and a save
 * button on a browse surface — asking for the keyboard while the reader is
 * scanning for something to do. The question itself is most of the value, so
 * that stays; writing happens on `/reflections`, or in the post-session screen
 * where the moment is already right.
 */
export function ReflectionPromptRow() {
  const { reflections, hydrated } = useApp();

  // Resolved on the client: the prompt depends on the local date, and these
  // pages are prerendered.
  const [today, setToday] = React.useState<string | null>(null);
  React.useEffect(() => setToday(toDateKey(new Date())), []);

  const prompt = today ? promptForDate(today) : null;
  const written = hydrated && today ? reflections.some((entry) => entry.date === today) : false;

  // Same height either way, so the row does not jump on hydration.
  if (!prompt) {
    return <Skeleton className="h-[74px]" />;
  }

  return (
    <Link
      href="/reflections"
      className="flex items-center gap-3.5 rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
        {written ? (
          <Check className="h-[17px] w-[17px] text-aurora-mint" strokeWidth={2.2} />
        ) : (
          <NotebookPen className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium leading-snug text-ink">
          {prompt.question}
        </span>
        <span className="mt-1 block text-[11.5px] leading-none text-ink-faint">
          {written ? 'Written today' : 'A sentence is plenty'}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
    </Link>
  );
}
