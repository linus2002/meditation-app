'use client';

import * as React from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';

import { RecommendedRail } from '@/components/home/recommended-rail';
import { SearchResults } from '@/components/search/search-results';
import { SectionTitle } from '@/components/shared/section-title';
import { categories } from '@/data/categories';
import { useBack } from '@/hooks/use-back';
import { searchLibrary } from '@/lib/search';

/**
 * Search, on a screen of its own. Every search bar in the app is a link here.
 *
 * The field is focused on arrival so the keyboard comes straight up, and the
 * bottom bar is left off — this sits outside the `(app)` shell — so results get
 * the whole screen while typing. With the field empty it offers the moods as
 * one-tap suggestions — each one is simply typed into the field — followed by
 * the home screen's recommended banners.
 */
export default function SearchPage() {
  const goBack = useBack();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');

  const trimmed = query.trim();
  const results = React.useMemo(() => searchLibrary(query), [query]);

  const suggest = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-full pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-canvas px-3 pb-3 pt-[calc(var(--header-gap)-13px)]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </button>

        <div className="flex h-12 flex-1 items-center gap-3 rounded-full border border-overlay/[0.12] bg-overlay/[0.04] px-4 focus-within:border-overlay/30">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.7} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions, stories and sounds"
            aria-label="Search the library"
            autoFocus
            enterKeyHint="search"
            className="h-full w-full bg-transparent text-body-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => suggest('')}
              aria-label="Clear search"
              className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="mt-3 px-5">
        {trimmed ? (
          <SearchResults query={trimmed} results={results} />
        ) : (
          <>
            <section>
              <SectionTitle>Try searching for</SectionTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => suggest(category.name)}
                      className="flex items-center gap-2 rounded-full bg-overlay/[0.06] px-4 py-2 text-caption font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-4 w-4 text-ink-muted"
                        strokeWidth={1.8}
                      />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-7">
              <SectionTitle>Recommended</SectionTitle>
              {/* The home screen's own banners; the rail carries its gutter, so it runs edge to edge. */}
              <div className="-mx-5 mt-3">
                <RecommendedRail />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
