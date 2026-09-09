import Image from 'next/image';
import Link from 'next/link';

import type { Meditation } from '@/types';

interface RatedTileProps {
  meditation: Meditation;
  /**
   * The line under the narrator — the reader's own stars, a play count, or
   * nothing. Passed in rather than derived here, because what the shelf is
   * ranked by changes with how much the reader has actually done.
   */
  meta?: React.ReactNode;
}

/**
 * Grid cell for the library shelf: round artwork beside the title, narrator and
 * whatever the shelf is ranking by. Two per row, so the text column is narrow
 * and everything in it is allowed to wrap or truncate rather than push the tile
 * wider.
 */
export function RatedTile({ meditation, meta }: RatedTileProps) {
  return (
    <li className="relative flex items-center gap-3">
      <span className="relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-full">
        <Image
          src={meditation.image}
          alt=""
          fill
          sizes="62px"
          placeholder="blur"
          className="object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(10,12,36,0.05)_0%,rgba(10,12,36,0.4)_100%)]"
        />
      </span>

      <span className="min-w-0 flex-1">
        <Link
          href={`/player/${meditation.id}`}
          className="static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <span className="block text-[13.5px] font-semibold leading-tight text-ink line-clamp-2">
            {meditation.title}
          </span>
        </Link>
        <span className="mt-1 block truncate text-[11.5px] leading-tight text-ink-muted">
          {meditation.narrator}
        </span>
        {meta ? (
          <span className="mt-1 flex items-center gap-1 text-[11.5px] leading-none text-ink-soft">
            {meta}
          </span>
        ) : null}
      </span>
    </li>
  );
}
