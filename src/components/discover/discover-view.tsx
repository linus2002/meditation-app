'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ChevronRight, Search, Timer, X } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { SoundscapeCard } from '@/components/shared/soundscape-card';
import { StoryCard } from '@/components/stories/story-card';
import { categories } from '@/data/categories';
import { meditations } from '@/data/meditations';
import { searchLibrary } from '@/lib/search';
import { cn } from '@/lib/utils';

/**
 * Browse and search, in one screen.
 *
 * With the field empty this is the browse experience: category chips, the two
 * shortcuts and every session. Type anything and it becomes a search across
 * the whole library — sessions, stories and soundscapes — because searching
 * only sessions left the other two thirds of the app unreachable by name.
 */
export function DiscoverView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const [query, setQuery] = React.useState('');

  const searching = query.trim().length > 0;
  const results = React.useMemo(() => searchLibrary(query), [query]);

  // Browse mode still filters by the category chip; search deliberately does
  // not, so a term is never quietly narrowed by a chip left selected earlier.
  const browseResults = React.useMemo(
    () =>
      activeCategory
        ? meditations.filter((item) => item.category === activeCategory)
        : meditations,
    [activeCategory],
  );

  const selectCategory = (slug: string | null) => {
    router.replace(slug ? `/discover?category=${slug}` : '/discover', { scroll: false });
  };

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Sessions" title="Discover" />

      <div className="mt-5 px-5">
        <div className="flex h-12 items-center gap-3 rounded-full border border-overlay/[0.12] bg-overlay/[0.04] px-4 focus-within:border-overlay/30">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.7} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions, stories and sounds"
            aria-label="Search the library"
            className="h-full w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      </div>

      {searching ? null : (
      <div className="rail mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          type="button"
          onClick={() => selectCategory(null)}
          aria-pressed={!activeCategory}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
            !activeCategory ? 'bg-action-pill text-white' : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
          )}
        >
          All
        </button>
        {categories.map((category) => {
          const isActive = activeCategory === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => selectCategory(category.slug)}
              aria-pressed={isActive}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                isActive ? 'bg-action-pill text-white' : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
      )}

      {searching ? (
        <div className="mt-6 px-5">
          {results.total === 0 ? (
            <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-muted">
              Nothing matches “{query.trim()}”.
              <br />
              Try a different word, or clear the field to browse.
            </p>
          ) : (
            <>
              <p className="text-[11.5px] leading-none text-ink-faint">
                {results.total} {results.total === 1 ? 'result' : 'results'} for “{query.trim()}”
              </p>

              {results.meditations.length > 0 ? (
                <section className="mt-4">
                  <SectionTitle>Sessions · {results.meditations.length}</SectionTitle>
                  <ul className="mt-3 space-y-2.5">
                    {results.meditations.map((meditation) => (
                      <MeditationCard key={meditation.id} meditation={meditation} />
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.stories.length > 0 ? (
                <section className="mt-6">
                  <SectionTitle>Stories · {results.stories.length}</SectionTitle>
                  <ul className="mt-3 space-y-2.5">
                    {results.stories.map((story) => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.soundscapes.length > 0 ? (
                <section className="mt-6">
                  <SectionTitle>Soundscapes · {results.soundscapes.length}</SectionTitle>
                  <ul className="mt-3 space-y-2.5">
                    {results.soundscapes.map((meta) => (
                      <SoundscapeCard key={meta.id} meta={meta} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : (
      <div className="mt-6 px-5">
        <Link
          href="/timer"
          className="group mb-4 flex items-center gap-3.5 rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action-pill">
            <Timer className="h-5 w-5 text-white" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight text-ink">
              Unguided Sit
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-muted">
              Your own length, bells at the start and end
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
        </Link>

        <Link
          href="/stories"
          className="group mb-4 flex items-center gap-3.5 rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3FD9C9_0%,#7CA9E8_55%,#F07BC8_100%)]">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-tight text-ink">
              Read-Aloud Stories
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-muted">
              Calm stories, read to you or read yourself
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
        </Link>

        <SectionTitle actionHref="/favorites" actionLabel="Saved">
          {activeCategory
            ? `${categories.find((item) => item.slug === activeCategory)?.name ?? 'Sessions'}`
            : 'All Sessions'}
        </SectionTitle>

        <ul className="mt-3 space-y-2.5">
          {browseResults.map((meditation) => (
            <MeditationCard key={meditation.id} meditation={meditation} />
          ))}
        </ul>
      </div>
      )}

      {searching ? null : (
      <div className="mt-7 px-5">
        <SectionTitle>Browse by mood</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.slug}
                type="button"
                onClick={() => selectCategory(category.slug)}
                className="group relative flex h-[88px] flex-col justify-end overflow-hidden rounded-tile p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                <Image
                  src={category.image}
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
                  {category.name}
                </span>
                <span className="relative mt-1 text-[11px] leading-none text-white/85">
                  {category.sessionCount} sessions
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
