'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Search, Timer, X } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { categories } from '@/data/categories';
import { meditations } from '@/data/meditations';
import { cn } from '@/lib/utils';

export function DiscoverView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const [query, setQuery] = React.useState('');

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return meditations.filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
      const matchesQuery =
        needle.length === 0 ||
        item.title.toLowerCase().includes(needle) ||
        item.subtitle.toLowerCase().includes(needle) ||
        item.narrator.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  const selectCategory = (slug: string | null) => {
    router.replace(slug ? `/discover?category=${slug}` : '/discover', { scroll: false });
  };

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Sessions" title="Discover" />

      <div className="mt-5 px-5">
        <div className="flex h-12 items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 focus-within:border-white/30">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.7} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions or narrators"
            aria-label="Search sessions"
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

      <div className="rail mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          type="button"
          onClick={() => selectCategory(null)}
          aria-pressed={!activeCategory}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
            !activeCategory ? 'bg-action-pill text-white' : 'bg-white/[0.06] text-ink-muted hover:text-ink',
          )}
        >
          All
        </button>
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => selectCategory(category.slug)}
              aria-pressed={isActive}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                isActive ? 'bg-action-pill text-white' : 'bg-white/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="mt-6 px-5">
        <Link
          href="/timer"
          className="group mb-4 flex items-center gap-3.5 rounded-tile bg-[#141733] p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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

        <SectionTitle actionHref="/favorites" actionLabel="Saved">
          {activeCategory
            ? `${categories.find((item) => item.slug === activeCategory)?.name ?? 'Sessions'}`
            : 'All Sessions'}
        </SectionTitle>

        {results.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {results.map((meditation) => (
              <MeditationCard key={meditation.id} meditation={meditation} />
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-center text-[13px] leading-relaxed text-ink-muted">
            Nothing matches “{query}” yet.
            <br />
            Try a different word or clear the filter.
          </p>
        )}
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
                className="group relative flex h-[88px] flex-col justify-end overflow-hidden rounded-tile p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
    </div>
  );
}
