import { MeditationCard } from '@/components/shared/meditation-card';
import { SectionTitle } from '@/components/shared/section-title';
import { SoundscapeCard } from '@/components/shared/soundscape-card';
import { StoryCard } from '@/components/stories/story-card';
import type { SearchResults as Results } from '@/lib/search';

/**
 * Results for a non-empty query, grouped by kind — sessions, stories, then
 * soundscapes — with each group left out when it has nothing to show.
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
  );
}
