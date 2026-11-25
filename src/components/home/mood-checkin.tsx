'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';

import { MoodScale } from '@/components/mood/mood-scale';
import { getMeditationsByCategory } from '@/data/meditations';
import { MOOD_CATEGORIES, MOOD_REPLIES, moodLabel } from '@/data/moods';
import { useToday } from '@/hooks/use-today';
import { formatMinutesLabel } from '@/lib/format';
import { checkinOn } from '@/lib/moods';
import { useApp } from '@/providers/app-provider';
import type { Meditation } from '@/types';

/** A suggestion is meant to be easy to say yes to: a few minutes, not a long sit. */
const SHORT_SESSION_SECONDS = 12 * 60;

/**
 * A session to match a mood: the first fitting category with a short one in
 * it, shortest first; failing that, the shortest in the first category.
 */
export function sessionForMood(score: number): Meditation | null {
  const categories = MOOD_CATEGORIES[score] ?? [];
  const shortestIn = (category: string, limit = Infinity) =>
    getMeditationsByCategory(category)
      .filter((meditation) => !meditation.isSleep && meditation.durationSeconds <= limit)
      .sort((a, b) => a.durationSeconds - b.durationSeconds)[0];

  for (const category of categories) {
    const short = shortestIn(category, SHORT_SESSION_SECONDS);
    if (short) return short;
  }
  for (const category of categories) {
    const any = shortestIn(category);
    if (any) return any;
  }
  return null;
}

/**
 * "How are you feeling today?" on the home screen: one tap, then a session
 * that fits. Once given it shrinks to a line, and can be changed all day.
 * The answer stays on this phone; only that a check-in happened is counted.
 */
export function MoodCheckin() {
  const { moods, logMood, hydrated } = useApp();
  const today = useToday();
  const [editing, setEditing] = React.useState(false);
  // The kind reply and suggestion show straight after answering, not on every visit.
  const [justAnswered, setJustAnswered] = React.useState(false);

  if (!hydrated || !today) return null;

  const existing = checkinOn(moods, today);
  const suggestion = existing ? sessionForMood(existing.score) : null;

  const answer = (score: number) => {
    logMood({
      // One check-in a day: changing it replaces it.
      id: existing?.id ?? `checkin-${today}`,
      date: today,
      at: Date.now(),
      score,
      context: 'checkin',
    });
    setEditing(false);
    setJustAnswered(true);
  };

  if (!existing || editing) {
    return (
      <section aria-label="Mood check-in" className="mt-6 px-5">
        <div className="rounded-tile bg-surface p-4">
          <p className="text-body-sm font-semibold leading-tight text-ink">How are you feeling today?</p>
          <p className="mt-1 text-label leading-snug text-ink-faint">One tap. Only you ever see this.</p>
          <MoodScale
            value={existing?.score ?? null}
            onChange={answer}
            label="How are you feeling today?"
            hideLabel
            className="mt-3"
          />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Mood check-in" className="mt-6 px-5">
      <div className="rounded-tile bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body-sm leading-tight text-ink">
            Today you’re feeling <span className="font-semibold">{moodLabel(existing.score).toLowerCase()}</span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full px-2 py-1 text-label font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Change
          </button>
        </div>

        {justAnswered ? (
          <p role="status" className="mt-1.5 text-label leading-snug text-ink-muted">
            {MOOD_REPLIES[existing.score]}
          </p>
        ) : null}

        {suggestion ? (
          <Link
            href={`/player/${suggestion.id}`}
            className="mt-3 flex items-center gap-3 rounded-xl bg-overlay/[0.04] p-2.5 transition-colors hover:bg-overlay/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <Image src={suggestion.image} alt="" fill sizes="40px" placeholder="blur" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-caption font-semibold leading-tight text-ink">
                {suggestion.title}
              </span>
              <span className="mt-0.5 block truncate text-label leading-tight text-ink-muted">
                {formatMinutesLabel(suggestion.durationSeconds)} · suggested for now
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
          </Link>
        ) : null}

        <Link
          href="/insights"
          className="mt-3 flex items-center gap-1 text-label font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Your mood this month
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </Link>
      </div>
    </section>
  );
}
