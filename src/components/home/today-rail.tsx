import Image from 'next/image';
import Link from 'next/link';
import { Clock, Star } from 'lucide-react';

import { todaysPicks } from '@/data/today';
import { formatShortMinutes } from '@/lib/format';

/**
 * Rail of short sessions for the current day.
 *
 * Narrower cards than the recommended rail, so two sit on screen at once and
 * the row reads as a list of quick options rather than a set of features. The
 * length band sits above the artwork, where it can be scanned without reading
 * any of the titles.
 */
export function TodayRail() {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1">
      {todaysPicks.map(({ meditation, band, rating, tryFree }) => (
        <li key={meditation.id} className="w-[45vw] max-w-[180px] shrink-0 snap-start">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{band}</span>
          </p>

          <Link
            href={`/player/${meditation.id}`}
            className="group mt-2 block focus-visible:outline-none"
          >
            <span className="relative block aspect-square overflow-hidden rounded-[15px]">
              <Image
                src={meditation.image}
                alt=""
                fill
                sizes="(max-width: 430px) 45vw, 180px"
                placeholder="blur"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[15px] ring-1 ring-inset ring-focus/10 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-focus"
              />
              {tryFree ? (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-canvas-deep/85 px-3 py-1.5 text-[10.5px] font-semibold leading-none text-white backdrop-blur-sm">
                  Try free
                </span>
              ) : null}
            </span>

            <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">
              {meditation.title}
            </span>
          </Link>

          <p className="mt-1 truncate text-[12.5px] leading-tight text-ink-muted">
            {meditation.narrator}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-[12px] leading-none text-ink-muted">
            {rating.toFixed(1)}
            <Star
              aria-hidden="true"
              className="h-3 w-3 fill-aurora-lime text-aurora-lime"
              strokeWidth={0}
            />
            <span className="sr-only">out of 5,</span>
            <span aria-hidden="true" className="px-0.5">
              ·
            </span>
            {formatShortMinutes(meditation.durationSeconds)}
          </p>
        </li>
      ))}
    </ul>
  );
}
