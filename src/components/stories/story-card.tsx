import Image from 'next/image';
import Link from 'next/link';

import { StoryFavoriteButton } from '@/components/stories/story-favorite-button';
import { estimatedMinutes } from '@/lib/story';
import type { Story } from '@/types';

const CATEGORY_LABEL: Record<Story['category'], string> = {
  sleep: 'Sleep',
  relaxation: 'Relaxation',
  mindfulness: 'Mindfulness',
};

/** List row for a story, matching the session card treatment. */
export function StoryCard({ story }: { story: Story }) {
  return (
    <li className="relative flex items-center gap-3.5 rounded-tile bg-[#141733] p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={story.image}
          alt=""
          fill
          sizes="56px"
          placeholder="blur"
          className="object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(10,12,36,0.05)_0%,rgba(10,12,36,0.35)_100%)]"
        />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/stories/${story.id}`}
          className="static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">{story.title}</p>
        </Link>
        <p className="mt-0.5 truncate text-[11.5px] leading-tight text-ink-muted">
          {story.description}
        </p>
        <p className="mt-1 text-[11px] leading-none text-ink-faint">
          {estimatedMinutes(story)} Min. · {CATEGORY_LABEL[story.category]}
        </p>
      </div>

      <StoryFavoriteButton storyId={story.id} title={story.title} className="relative z-10" />
    </li>
  );
}
