'use client';

import { SectionTitle } from '@/components/shared/section-title';
import { StoryRail } from '@/components/stories/story-rail';
import { stories } from '@/data/stories';
import { useAssessmentRanking } from '@/hooks/use-assessment-picks';
import { prioritise } from '@/lib/assessment';
import type { Story, StoryCategory } from '@/types';

const SECTIONS: { category: StoryCategory; title: string }[] = [
  { category: 'sleep', title: 'Sleep stories' },
  { category: 'relaxation', title: 'Relaxation stories' },
  { category: 'mindfulness', title: 'Mindfulness stories' },
];

/**
 * Every story, as one sideways row per kind, led by whatever the assessment
 * suggested. Saved stories live on the Saved
 * screen, not here. Rows rather than one long list, so each kind can be found at a glance.
 */
export function StorySections({ className }: { className?: string }) {
  const suggested = useAssessmentRanking()?.stories ?? [];

  // As on the Meditation tab: the row with the strongest suggestion first, and
  // each row opening on its own suggestions.
  const rankOf = (items: Story[]) =>
    Math.min(...items.map((item) => suggested.indexOf(item.id)).filter((rank) => rank !== -1), Infinity);
  const rows = SECTIONS.map(({ category, title }) => ({
    key: category,
    title,
    items: prioritise(
      stories.filter((story) => story.category === category),
      suggested,
    ),
  }))
    .filter((row) => row.items.length > 0)
    .map((row, index) => ({ row, index, rank: rankOf(row.items) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);

  return (
    <div className={className}>
      {rows.map((row, index) => (
        <section key={row.key} className={index > 0 ? 'mt-7' : undefined}>
          <SectionTitle className="px-5">{row.title}</SectionTitle>
          <div className="mt-3">
            <StoryRail stories={row.items} />
          </div>
        </section>
      ))}
    </div>
  );
}
