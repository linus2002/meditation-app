'use client';

import Link from 'next/link';
import { HeartOff } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { SkeletonList } from '@/components/shared/skeleton';
import { StoryCard } from '@/components/stories/story-card';
import { getMeditation, meditations } from '@/data/meditations';
import { getStory } from '@/data/stories';
import { useApp } from '@/providers/app-provider';

export default function FavoritesPage() {
  const { favorites, favoriteStories, recents, hydrated } = useApp();

  const saved = favorites
    .map((id) => getMeditation(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  // Stories are saved separately (their ids could clash with sessions'), but belong here too.
  const savedStories = favoriteStories
    .map((id) => getStory(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const total = saved.length + savedStories.length;

  const recent = recents
    .map((id) => getMeditation(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="pb-4">
      <ScreenHeader
        eyebrow={
          hydrated ? `${total} saved` : 'Your saves'
        }
        title="Saved"
      />

      <div className="mt-6 px-5">
        {!hydrated ? (
          <SkeletonList count={3} />
        ) : total > 0 ? (
          <>
            {saved.length > 0 ? (
              <ul className="space-y-2.5">
                {saved.map((meditation) => (
                  <MeditationCard key={meditation.id} meditation={meditation} />
                ))}
              </ul>
            ) : null}
            {savedStories.length > 0 ? (
              <div className={saved.length > 0 ? 'mt-7' : undefined}>
                <SectionTitle>Stories</SectionTitle>
                <ul className="mt-3 space-y-2.5">
                  {savedStories.map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
              <HeartOff className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
            </span>
            <p className="mt-4 text-[0.9375rem] font-medium text-ink">Nothing saved yet</p>
            <p className="mt-1.5 max-w-[250px] text-caption leading-relaxed text-ink-muted">
              Tap the heart on any session or story and it will wait for you here.
            </p>
            <GradientButton asChild className="mt-6 h-11 px-7 text-body-sm">
              <Link href="/discover">Browse sessions</Link>
            </GradientButton>
          </div>
        )}
      </div>

      {recent.length > 0 ? (
        <div className="mt-7 px-5">
          <SectionTitle>Recently Played</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {recent.map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 px-5">
        <SectionTitle actionHref="/discover" actionLabel="See all">
          You Might Like
        </SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {meditations
            .filter((item) => !favorites.includes(item.id))
            .slice(0, 3)
            .map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
        </ul>
      </div>
    </div>
  );
}
