import { ScreenHeader } from '@/components/layout/screen-header';
import { StorySections } from '@/components/stories/story-sections';

export default function StoriesPage() {
  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Read or listen" title="Stories" />

      <p className="mt-4 px-5 text-caption leading-relaxed text-ink-muted">
        Slow stories with nothing much happening in them. Read them yourself, or have them read to
        you.
      </p>

      <StorySections className="mt-6" />
    </div>
  );
}
