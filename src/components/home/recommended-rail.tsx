import Image from 'next/image';
import Link from 'next/link';
import { ListMusic, Play } from 'lucide-react';

import { recommended } from '@/data/recommended';
import { formatMinutesLabel } from '@/lib/format';

/**
 * Horizontal rail of recommended sessions.
 *
 * The card follows the supplied reference: artwork with a pill label laid over
 * its top-left, then the title and narrator, a filled pill action, and a small
 * centred control beneath it. Cards are just under full width so the next one
 * peeks in, which is what tells you the row scrolls.
 */
export function RecommendedRail() {
  return (
    <div className="rail flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
      {recommended.map(({ meditation, collection, tint, image }) => (
        <article
          key={meditation.id}
          className="w-[82vw] max-w-[330px] shrink-0 snap-start overflow-hidden rounded-[16px]"
          style={{ backgroundColor: tint }}
        >
          <div className="relative aspect-[16/9]">
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 430px) 82vw, 318px"
              placeholder="blur"
              className="object-cover"
            />
            <span className="absolute left-3 top-3 rounded-full bg-canvas-deep/85 px-3.5 py-1.5 text-[11.5px] font-semibold leading-none text-white backdrop-blur-sm">
              {collection}
            </span>
          </div>

          <div className="px-4 pb-4 pt-3.5">
            <p className="truncate text-[15.5px] font-bold leading-tight text-ink">
              {meditation.title}
            </p>
            <p className="mt-1 truncate text-[13px] leading-tight text-ink-muted">
              {meditation.narrator} · {formatMinutesLabel(meditation.durationSeconds)}
            </p>

            <Link
              href={`/player/${meditation.id}`}
              className="mt-4 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[14px] font-semibold text-canvas-deep transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Play className="h-[15px] w-[15px] fill-canvas-deep" />
              Start session
            </Link>

            <Link
              href={`/discover?category=${meditation.category}`}
              aria-label={`More in ${collection}`}
              className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ListMusic className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
