import Image from 'next/image';
import Link from 'next/link';

import { recommended } from '@/data/recommended';
import { formatMinutesLabel } from '@/lib/format';

/**
 * Horizontal rail of recommended sessions.
 *
 * Artwork with a pill label laid over its top-left, then the title and
 * narrator with a solid Start session pill beside them (black on the light
 * page, white on the dark one). Cards are just
 * under full width so the next one peeks in, which is what tells you the row
 * scrolls.
 */
export function RecommendedRail() {
  return (
    <div className="rail flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
      {recommended.map(({ meditation, collection, image }) => (
        <article key={meditation.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start">
          {/* The artwork carries its own rounding; the text sits straight on the page. */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-[16px]">
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 430px) 82vw, 318px"
              placeholder="blur"
              className="object-cover"
            />
            <span className="absolute left-3 top-3 rounded-full bg-canvas-deep/85 px-2.5 py-1 text-label font-semibold leading-none text-white backdrop-blur-sm">
              {collection}
            </span>
          </div>

          {/* Title and narrator on the left, the action beside them. */}
          <div className="flex items-center gap-3 px-0.5 pb-1 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.96875rem] font-medium leading-tight text-ink">
                {meditation.title}
              </p>
              <p className="mt-1 truncate text-body-sm leading-tight text-ink-muted">
                {meditation.narrator} · {formatMinutesLabel(meditation.durationSeconds)}
              </p>
            </div>

            <Link
              href={`/player/${meditation.id}`}
              className="flex h-9 shrink-0 items-center rounded-full bg-black px-4 text-[0.8125rem] font-medium text-white [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-black transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              Start session
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
