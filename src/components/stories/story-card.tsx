import Image from 'next/image';
import Link from 'next/link';

import { estimatedMinutes } from '@/lib/story';
import type { Story } from '@/types';

const CATEGORY_LABEL: Record<Story['category'], string> = {
  sleep: 'Sleep',
  relaxation: 'Relaxation',
  mindfulness: 'Mindfulness',
};

/**
 * List row for a story: its cover (the designed artwork, as on its own screen)
 * at its true colours, then title, line and length, on the page itself
 * with no box behind it. Saving a story is done from its own screen (the heart
 * in its header), which keeps these lists quiet.
 */
export function StoryCard({ story }: { story: Story }) {
  return (
    <li className="group relative flex items-center gap-3.5 py-0.5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] transition-opacity group-hover:opacity-90">
        <Image
          src={story.cover ?? story.image}
          alt=""
          fill
          sizes="56px"
          placeholder="blur"
          className="object-cover"
        />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/stories/${story.id}`}
          className="static before:absolute before:inset-0 before:rounded-[6px] before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-focus/70"
        >
          <p className="truncate text-body-sm font-semibold leading-tight text-ink group-hover:underline group-hover:underline-offset-2">{story.title}</p>
        </Link>
        <p className="mt-0.5 truncate text-label leading-tight text-ink-muted">
          {story.description}
        </p>
        <p className="mt-1 text-label leading-none text-ink-faint">
          {estimatedMinutes(story)} Min. · {CATEGORY_LABEL[story.category]}
        </p>
      </div>
    </li>
  );
}
