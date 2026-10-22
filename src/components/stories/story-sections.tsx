'use client';

import { SectionTitle } from '@/components/shared/section-title';
import { StoryRail } from '@/components/stories/story-rail';
import { stories } from '@/data/stories';
import { useApp } from '@/providers/app-provider';
import type { StoryCategory } from '@/types';

const SECTIONS: { category: StoryCategory; title: string }[] = [
  { category: 'sleep', title: 'Sleep stories' },
  { category: 'relaxation', title: 'Relaxation stories' },
  { category: 'mindfulness', title: 'Mindfulness stories' },
];

/**
 * Every story, as one sideways row per kind, with the reader's saved ones
 * first. Rows rather than one long list, so each kind can be found at a glance.
 */
export function StorySections({ className }: { className?: string }) {
  const { favoriteStories, hydrated } = useApp();
  const saved = hydrated ? stories.filter((story) => favoriteStories.includes(story.id)) : [];

  const rows = [
    ...(saved.length > 0 ? [{ key: 'saved', title: 'Saved', items: saved }] : []),
    ...SECTIONS.map(({ category, title }) => ({
      key: category,
      title,
      items: stories.filter((story) => story.category === category),
    })),
  ].filter((row) => row.items.length > 0);

  return (
    <div className={className}>
      {rows.map((row, index) => (
        <section key={row.key} className={index > 0 ? 'mt-7' : undefined}>
          <SectionTitle className="px-5">
            {row.title} · {row.items.length}
          </SectionTitle>
          <div className="mt-3">
            <StoryRail stories={row.items} />
          </div>
        </section>
      ))}
    </div>
  );
}
