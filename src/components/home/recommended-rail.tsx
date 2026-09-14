import Image from 'next/image';
import Link from 'next/link';
import { ListMusic } from 'lucide-react';

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
      {/* One gradient for every card's play glyph — the same as Start Your Goal. */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="reco-play-gradient" x1="18%" y1="8%" x2="82%" y2="92%">
            <stop offset="0%" stopColor="#1D9FDA" />
            <stop offset="38%" stopColor="#61A644" />
            <stop offset="66%" stopColor="#61A644" />
            <stop offset="100%" stopColor="#2FE0CB" />
          </linearGradient>
        </defs>
      </svg>

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
            <span className="absolute left-3 top-3 rounded-full bg-canvas-deep/85 px-3.5 py-1.5 text-[11.5px] font-semibold leading-none text-white backdrop-blur-sm">
              {collection}
            </span>
          </div>

          <div className="px-0.5 pb-1 pt-3">
            <p className="truncate text-[15.5px] font-bold leading-tight text-ink">
              {meditation.title}
            </p>
            <p className="mt-1 truncate text-[13px] leading-tight text-ink-muted">
              {meditation.narrator} · {formatMinutesLabel(meditation.durationSeconds)}
            </p>

            <Link
              href={`/player/${meditation.id}`}
              className="mt-4 flex h-[46px] w-full items-center justify-center gap-2.5 rounded-full bg-surface text-[14px] font-semibold text-ink shadow-tile transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
                <path
                  d="M8 5.2 19 12 8 18.8Z"
                  fill="url(#reco-play-gradient)"
                  stroke="url(#reco-play-gradient)"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
              </svg>
              Start session
            </Link>

            <Link
              href={`/discover?category=${meditation.category}`}
              aria-label={`More in ${collection}`}
              className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <ListMusic className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
