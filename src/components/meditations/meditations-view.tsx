'use client';

import * as React from 'react';
import Image from 'next/image';
import { Bookmark } from 'lucide-react';

import { LibraryHeader } from '@/components/meditations/library-header';
import { RatedTile } from '@/components/meditations/rated-tile';
import { SoundscapeGrid } from '@/components/meditations/soundscape-grid';
import { TargetCard } from '@/components/meditations/target-card';
import { MeditationCard } from '@/components/shared/meditation-card';
import { RatingStars } from '@/components/shared/rating-stars';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton, SkeletonList } from '@/components/shared/skeleton';
import { StoryCard } from '@/components/stories/story-card';
import { categories } from '@/data/categories';
import { meditations } from '@/data/meditations';
import { stories, storyCategories } from '@/data/stories';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';
import type { CategorySlug, StoryCategory } from '@/types';

type TabId = 'all' | 'meditation' | 'soundscape' | 'stories';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'meditation', label: 'Meditation' },
  { id: 'soundscape', label: 'Soundscape' },
  { id: 'stories', label: 'Stories' },
];


/**
 * The library: everything the app holds, in one place, split by what kind of
 * thing it is rather than by mood. Categories filter within the Meditation tab
 * so the tab strip stays about content type and does not mix the two axes.
 */
export function MeditationsView() {
  const [tab, setTab] = React.useState<TabId>('all');
  const [category, setCategory] = React.useState<CategorySlug | 'all'>('all');
  const [storyFilter, setStoryFilter] = React.useState<StoryCategory | 'all'>('all');

  const { favorites, favoriteStories, ratings, sessions, hydrated } = useApp();

  /*
   * There is no server, so there is no community average to rank by — and
   * inventing one is what this shelf used to do. It now ranks by whatever the
   * reader has actually given us, in order of how much that is worth: their own
   * ratings first, then what they have played most, and only failing both a
   * plain starting point that claims nothing.
   */
  const shelf = React.useMemo(() => {
    if (!hydrated) return null;

    const rated = meditations
      .filter((item) => ratings[item.id])
      .sort((a, b) => ratings[b.id] - ratings[a.id]);
    if (rated.length > 0) {
      return {
        title: 'Your highest rated',
        items: rated,
        meta: (item: (typeof meditations)[number]) => (
          <RatingStars value={ratings[item.id]} size="sm" />
        ),
      };
    }

    const plays = new Map<string, number>();
    for (const record of sessions) {
      plays.set(record.meditationId, (plays.get(record.meditationId) ?? 0) + 1);
    }
    const played = meditations
      .filter((item) => plays.has(item.id))
      .sort((a, b) => (plays.get(b.id) ?? 0) - (plays.get(a.id) ?? 0));
    if (played.length > 0) {
      return {
        title: 'You come back to these',
        items: played,
        meta: (item: (typeof meditations)[number]) => {
          const count = plays.get(item.id) ?? 0;
          return `${count} ${count === 1 ? 'sit' : 'sits'}`;
        },
      };
    }

    return { title: 'Start here', items: meditations, meta: () => null };
  }, [hydrated, ratings, sessions]);

  const savedMeditations = hydrated
    ? meditations.filter((item) => favorites.includes(item.id))
    : [];
  const savedStories = hydrated
    ? stories.filter((story) => favoriteStories.includes(story.id))
    : [];
  const savedCount = savedMeditations.length + savedStories.length;

  const shownMeditations =
    category === 'all' ? meditations : meditations.filter((item) => item.category === category);
  const shownStories =
    storyFilter === 'all' ? stories : stories.filter((story) => story.category === storyFilter);

  return (
    <div className="pb-4">
      <LibraryHeader />

      {/* Content type, not mood — the mood filter lives inside the Meditation tab. */}
      <div
        role="tablist"
        aria-label="Library sections"
        className="rail sticky top-[calc(env(safe-area-inset-top,0px)+62px)] z-20 flex gap-6 overflow-x-auto bg-canvas px-5"
      >
        {TABS.map(({ id, label }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(id)}
              className={cn(
                'relative shrink-0 pb-2.5 pt-1 text-[15px] font-medium leading-none transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                selected ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {label}
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-nav-active"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="mx-5 h-px bg-overlay/[0.07]" />

      {tab === 'all' ? (
        <>
          <div className="mt-5 px-5">
            <TargetCard />
          </div>

          <section className="mt-7 px-5">
            <SectionTitle actionHref={savedCount > 0 ? '/favorites' : undefined} actionLabel="See all">
              Favorites
            </SectionTitle>

            {!hydrated ? (
              <SkeletonList count={2} className="mt-3" />
            ) : savedCount > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {savedMeditations.map((meditation) => (
                  <MeditationCard key={meditation.id} meditation={meditation} />
                ))}
                {savedStories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </ul>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border border-dashed border-overlay/20">
                  <Bookmark className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
                </span>
                <p className="text-[14px] leading-snug text-ink-muted">
                  Save your favorite content into your personal library.
                </p>
              </div>
            )}
          </section>

          <section className="mt-8 px-5">
            <SectionTitle actionHref="/discover" actionLabel="See all">
              {shelf?.title ?? 'Start here'}
            </SectionTitle>
            {shelf ? (
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                {shelf.items.slice(0, 6).map((meditation) => (
                  <RatedTile
                    key={meditation.id}
                    meditation={meditation}
                    meta={shelf.meta(meditation)}
                  />
                ))}
              </ul>
            ) : (
              /* Ranked by stored ratings and play counts, so it cannot be
                 ordered correctly until those have been read. */
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-[62px] rounded-xl" />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 px-5">
            <SectionTitle>Categories</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {categories.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setCategory(item.slug);
                      setTab('meditation');
                    }}
                    className="group relative flex h-[88px] flex-col justify-end overflow-hidden rounded-tile p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 430px) 50vw, 200px"
                      placeholder="blur"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,36,0.25)_0%,rgba(10,12,36,0.55)_45%,rgba(10,12,36,0.88)_100%)]"
                    />
                    <Icon
                      aria-hidden="true"
                      className="absolute right-3 top-3 h-4 w-4 text-white/85"
                      strokeWidth={1.8}
                    />
                    <span className="relative text-[14px] font-semibold leading-none text-white">
                      {item.name}
                    </span>
                    <span className="relative mt-1 text-[11px] leading-none text-white/85">
                      {item.sessionCount} sessions
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8 px-5">
            <SectionTitle>Soundscapes</SectionTitle>
            <div className="mt-3">
              <SoundscapeGrid limit={4} />
            </div>
            <button
              type="button"
              onClick={() => setTab('soundscape')}
              className="mt-3 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              All eight soundscapes
            </button>
          </section>

          <section className="mt-8 px-5">
            <SectionTitle>Stories</SectionTitle>
            <ul className="mt-3 space-y-2.5">
              {stories.slice(0, 3).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setTab('stories')}
              className="mt-3 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              All {stories.length} stories
            </button>
          </section>
        </>
      ) : null}

      {tab === 'meditation' ? (
        <>
          <div
            role="radiogroup"
            aria-label="Filter by category"
            className="rail mt-4 flex gap-2 overflow-x-auto px-5 pb-1"
          >
            {[{ slug: 'all' as const, name: 'All' }, ...categories].map((item) => {
              const selected = category === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setCategory(item.slug)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                    selected
                      ? 'bg-action-pill text-white'
                      : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>

          <section className="mt-5 px-5">
            <SectionTitle>
              {category === 'all'
                ? `All ${meditations.length} sessions`
                : `${categories.find((item) => item.slug === category)?.name ?? 'Sessions'} · ${shownMeditations.length}`}
            </SectionTitle>
            <ul className="mt-3 space-y-2.5">
              {shownMeditations.map((meditation) => (
                <MeditationCard key={meditation.id} meditation={meditation} />
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {tab === 'soundscape' ? (
        <section className="mt-5 px-5">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            Ambient beds, synthesised on the fly rather than streamed. Play one on its own, or let a
            session bring its own.
          </p>
          <div className="mt-4">
            <SoundscapeGrid />
          </div>
        </section>
      ) : null}

      {tab === 'stories' ? (
        <>
          <div
            role="radiogroup"
            aria-label="Filter stories"
            className="rail mt-4 flex gap-2 overflow-x-auto px-5 pb-1"
          >
            {storyCategories.map((item) => {
              const selected = storyFilter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setStoryFilter(item.value)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                    selected
                      ? 'bg-action-pill text-white'
                      : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <section className="mt-5 px-5">
            <SectionTitle actionHref="/stories" actionLabel="Reader">
              {storyFilter === 'all'
                ? `All ${stories.length} stories`
                : storyCategories.find((item) => item.value === storyFilter)?.label ?? 'Stories'}
            </SectionTitle>
            <ul className="mt-3 space-y-2.5">
              {shownStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <p className="mt-8 px-5 text-center text-[11.5px] leading-relaxed text-ink-faint">
        {meditations.length} sessions · {stories.length} stories · 8 soundscapes
      </p>
    </div>
  );
}
