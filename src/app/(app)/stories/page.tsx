'use client';

import * as React from 'react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SectionTitle } from '@/components/shared/section-title';
import { StoryCard } from '@/components/stories/story-card';
import { stories, storyCategories } from '@/data/stories';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';
import type { StoryCategory } from '@/types';

export default function StoriesPage() {
  const { favoriteStories, hydrated } = useApp();
  const [filter, setFilter] = React.useState<StoryCategory | 'all'>('all');

  const matches = (story: (typeof stories)[number]) =>
    filter === 'all' || story.category === filter;

  // Saved follows the filter too — a category view that still showed unrelated
  // saved stories would just look like the filter had not worked.
  const saved = hydrated
    ? stories.filter((story) => favoriteStories.includes(story.id) && matches(story))
    : [];
  const shown = stories.filter(matches);

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Read or listen" title="Stories" />

      <p className="mt-4 px-5 text-[12.5px] leading-relaxed text-ink-muted">
        Slow stories with nothing much happening in them. Read them yourself, or have them read to
        you.
      </p>

      <div
        role="radiogroup"
        aria-label="Filter stories"
        className="rail mt-5 flex gap-2 overflow-x-auto px-5"
      >
        {storyCategories.map((category) => {
          const selected = filter === category.value;
          return (
            <button
              key={category.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setFilter(category.value)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                selected
                  ? 'bg-action-pill text-white'
                  : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {saved.length > 0 ? (
        <section className="mt-6 px-5">
          <SectionTitle>Saved</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {saved.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 px-5">
        <SectionTitle>
          {filter === 'all'
            ? 'All Stories'
            : storyCategories.find((c) => c.value === filter)?.label ?? 'Stories'}
        </SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {shown.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </ul>
      </section>
    </div>
  );
}
