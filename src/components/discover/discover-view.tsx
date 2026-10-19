'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, ChevronRight, Timer } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SearchBarLink } from '@/components/search/search-bar-link';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { categories } from '@/data/categories';
import { meditations } from '@/data/meditations';
import { cn } from '@/lib/utils';

/**
 * Browse: category chips, the two shortcuts and every session. The search bar
 * at the top opens the search screen, which covers the whole library —
 * sessions, stories and soundscapes.
 */
export function DiscoverView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
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
        <SearchBarLink />
      </div>

      <div className="rail mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          type="button"
          onClick={() => selectCategory(null)}
          aria-pressed={!activeCategory}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-caption font-medium transition-colors',
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
                'shrink-0 rounded-full px-4 py-2 text-caption font-medium transition-colors',
                isActive ? 'bg-action-pill text-white' : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="mt-6 px-5">
        <Link
          href="/timer"
          className="group mb-4 flex items-center gap-3.5 rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action-pill">
            <Timer className="h-5 w-5 text-white" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold leading-tight text-ink">
              Unguided Sit
            </span>
            <span className="mt-0.5 block text-label leading-tight text-ink-muted">
              Your own length, bells at the start and end
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
        </Link>

        <Link
          href="/stories"
          className="group mb-4 flex items-center gap-3.5 rounded-tile bg-surface p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3FD9C9_0%,#7CA9E8_55%,#1D9FDA_100%)]">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold leading-tight text-ink">
              Read-Aloud Stories
            </span>
            <span className="mt-0.5 block text-label leading-tight text-ink-muted">
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
                <span className="relative text-body-sm font-semibold leading-none text-white">
                  {category.name}
                </span>
                <span className="relative mt-1 text-label leading-none text-white/85">
                  {category.sessionCount} sessions
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
