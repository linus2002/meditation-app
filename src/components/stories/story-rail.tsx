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
 * Rail of stories as square covers with the title and length beneath. The
 * next cover peeks in at the edge, which is what tells you the row scrolls.
 */
export function StoryRail({ stories }: { stories: Story[] }) {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
      {stories.map((story) => (
        <li key={story.id} className="w-[40vw] max-w-[160px] shrink-0 snap-start">
          <Link href={`/stories/${story.id}`} className="group block focus-visible:outline-none">
            <span className="relative block aspect-square overflow-hidden rounded-[16px]">
              <Image
                src={story.cover ?? story.image}
                alt=""
                fill
                sizes="(max-width: 430px) 40vw, 160px"
                placeholder="blur"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[16px] ring-1 ring-inset ring-focus/10 group-focus-visible:ring-2 group-focus-visible:ring-focus"
              />
            </span>
            <span className="mt-2.5 block truncate text-body-sm font-semibold leading-tight text-ink">
              {story.title}
            </span>
          </Link>
          <p className="mt-1 truncate text-caption leading-tight text-ink-muted">
            {estimatedMinutes(story)} Min. · {CATEGORY_LABEL[story.category]}
          </p>
        </li>
      ))}
    </ul>
  );
}
