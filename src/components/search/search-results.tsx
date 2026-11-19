import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { SoundscapeCard } from '@/components/shared/soundscape-card';
import { StoryCard } from '@/components/stories/story-card';
import { YogaCard } from '@/components/yoga/yoga-card';
import type { Program } from '@/data/programs';
import type { Shortcut } from '@/data/shortcuts';
import type { SearchResults as Results } from '@/lib/search';

const ROW_LINK =
  "static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70";

/** List row for a programme, matching the session rows. */
function ProgramRow({ program }: { program: Program }) {
  return (
    <li className="relative flex items-center gap-3.5 rounded-tile bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        <Image src={program.image} alt="" fill sizes="56px" placeholder="blur" className="object-cover" />
        <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: program.scrim }} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={program.href} className={ROW_LINK}>
          <p className="truncate text-body-sm font-semibold leading-tight text-ink">{program.title}</p>
        </Link>
        <p className="mt-0.5 truncate text-label leading-tight text-ink-muted">{program.description}</p>
        <p className="mt-1 text-label leading-none text-ink-faint">
          {program.sessions.length} sessions · {program.level} · {program.author}
        </p>
      </div>
    </li>
  );
}

/** List row for one of the app's own screens. */
function PageRow({ page }: { page: Shortcut }) {
  const Icon = page.icon;
  return (
    <li className="relative flex items-center gap-3.5 rounded-tile bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-overlay/[0.06]">
        <Icon className="h-[22px] w-[22px] text-ink-soft" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={page.href} className={ROW_LINK}>
          <p className="truncate text-body-sm font-semibold leading-tight text-ink">{page.label}</p>
        </Link>
        <p className="mt-0.5 line-clamp-2 text-label leading-tight text-ink-muted">{page.description}</p>
      </div>
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
    </li>
  );
}

/**
 * Results for a non-empty query, grouped by kind — programmes, sessions,
 * stories, yoga, soundscapes, then the app's screens — with each group left
 * out when it has nothing to show.
 */
export function SearchResults({ query, results }: { query: string; results: Results }) {
  if (results.total === 0) {
    return (
      <p className="mt-10 text-center text-body-sm leading-relaxed text-ink-muted">
        Nothing matches “{query}”.
        <br />
        Try a different word, or one of the suggestions.
      </p>
    );
  }

  return (
    <>
      <p className="text-label leading-none text-ink-faint">
        {results.total} {results.total === 1 ? 'result' : 'results'} for “{query}”
      </p>

      {results.programs.length > 0 ? (
        <section className="mt-4">
          <SectionTitle>Programmes · {results.programs.length}</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {results.programs.map((program) => (
              <ProgramRow key={program.id} program={program} />
            ))}
          </ul>
        </section>
      ) : null}

      {results.meditations.length > 0 ? (
        <section className={results.programs.length > 0 ? 'mt-6' : 'mt-4'}>
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

      {results.yoga.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>Yoga · {results.yoga.length}</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {results.yoga.map((session) => (
              <YogaCard key={session.id} session={session} />
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

      {results.pages.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>In the app · {results.pages.length}</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {results.pages.map((page) => (
              <PageRow key={page.href} page={page} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
