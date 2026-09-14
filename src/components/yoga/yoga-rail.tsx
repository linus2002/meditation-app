import Image from 'next/image';
import Link from 'next/link';

import { yogaSessions } from '@/data/yoga';
import { formatMinutesLabel } from '@/lib/format';
import { totalSeconds } from '@/lib/yoga';

/** How many sessions the home overview shows; the rest live in the Yoga tab. */
const HOME_COUNT = 4;

/**
 * A short overview of yoga on the home screen: tall artwork with what it's
 * for laid over the bottom, the title and length beneath.
 */
export function YogaRail() {
  return (
    <ul className="rail flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1">
      {yogaSessions.slice(0, HOME_COUNT).map((session) => (
        <li key={session.id} className="w-[45vw] max-w-[180px] shrink-0 snap-start">
          <Link href={`/yoga/${session.id}`} className="group block focus-visible:outline-none">
            <span className="relative block aspect-[4/5] overflow-hidden rounded-[15px]">
              <Image
                src={session.image}
                alt=""
                fill
                sizes="(max-width: 430px) 45vw, 180px"
                placeholder="blur"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,36,0)_45%,rgba(10,12,36,0.72)_100%)]"
              />
              <span className="absolute bottom-2.5 left-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/90">
                {session.focus}
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[15px] ring-1 ring-inset ring-focus/10 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-focus"
              />
            </span>

            <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">
              {session.title}
            </span>
          </Link>
          <p className="mt-1 text-[12px] leading-none text-ink-muted">
            {formatMinutesLabel(totalSeconds(session.poses))} · {session.level}
          </p>
        </li>
      ))}
    </ul>
  );
}
