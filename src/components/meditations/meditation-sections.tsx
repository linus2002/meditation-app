'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { SectionTitle } from '@/components/shared/section-title';
import { categories } from '@/data/categories';
import { meditations } from '@/data/meditations';
import { useAssessmentRanking } from '@/hooks/use-assessment-picks';
import { prioritise } from '@/lib/assessment';
import { formatMinutesLabel } from '@/lib/format';
import type { CategorySlug, Meditation } from '@/types';

/**
 * Sessions as square covers in a sideways row, matching the story rows. The
 * next cover peeks in at the edge, which is what tells you the row scrolls.
 */
function MeditationRail({ items }: { items: Meditation[] }) {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
      {items.map((meditation) => (
        <li key={meditation.id} className="w-[40vw] max-w-[160px] shrink-0 snap-start">
          <Link
            href={`/player/${meditation.id}`}
            className="group block focus-visible:outline-none"
          >
            <span className="relative block aspect-square overflow-hidden rounded-[16px]">
              <Image
                src={meditation.image}
                alt=""
                fill
                sizes="(max-width: 430px) 40vw, 160px"
                placeholder="blur"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-focus/10 group-focus-visible:ring-2 group-focus-visible:ring-focus"
              />
            </span>
            <span className="mt-2.5 block truncate text-body-sm font-semibold leading-tight text-ink">
              {meditation.title}
            </span>
          </Link>
          <p className="mt-1 truncate text-caption leading-tight text-ink-muted">
            {formatMinutesLabel(meditation.durationSeconds)} · {meditation.narrator}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every library session, one sideways row per category, led by whatever the
 * assessment suggested. Saved sessions live on the Saved screen, not here. `focus` scrolls a category's row into view, for when a
 * category tile elsewhere on the page sends the reader here.
 */
export function MeditationSections({
  focus,
  className,
}: {
  focus?: CategorySlug | 'all';
  className?: string;
}) {
  const suggested = useAssessmentRanking()?.meditations ?? [];

  // After the assessment, the row holding its strongest suggestion comes first
  // and each row opens on its own suggestions.
  const rankOf = (items: Meditation[]) =>
    Math.min(...items.map((item) => suggested.indexOf(item.id)).filter((rank) => rank !== -1), Infinity);
  const rows = categories
    .map((category) => ({
      key: category.slug,
      title: category.name,
      items: prioritise(
        meditations.filter((item) => item.category === category.slug),
        suggested,
      ),
    }))
    .filter((row) => row.items.length > 0)
    .map((row, index) => ({ row, index, rank: rankOf(row.items) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);

  React.useEffect(() => {
    if (!focus || focus === 'all') return;
    document.getElementById(`meditations-${focus}`)?.scrollIntoView({ block: 'start' });
  }, [focus]);

  return (
    <div className={className}>
      {rows.map((row, index) => (
        <section
          key={row.key}
          id={`meditations-${row.key}`}
          className={index > 0 ? 'mt-7 scroll-mt-32' : 'scroll-mt-32'}
        >
          <SectionTitle className="px-5">{row.title}</SectionTitle>
          <div className="mt-3">
            <MeditationRail items={row.items} />
          </div>
        </section>
      ))}
    </div>
  );
}
