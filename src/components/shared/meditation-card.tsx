import Image from 'next/image';
import Link from 'next/link';

import { FavoriteButton } from '@/components/shared/favorite-button';
import { formatMinutesLabel } from '@/lib/format';
import type { Meditation } from '@/types';

/**
 * List row used across discovery, sleep and saved sessions. The thumbnail is
 * the session's own artwork, tinted so white type stays legible over any photo.
 */
export function MeditationCard({ meditation }: { meditation: Meditation }) {
  return (
    <li className="relative flex items-center gap-3.5 rounded-tile bg-[#141733] p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
        <Image
          src={meditation.image}
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
          href={`/player/${meditation.id}`}
          className="static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">
            {meditation.title}
          </p>
        </Link>
        <p className="mt-0.5 truncate text-[11.5px] leading-tight text-ink-muted">
          {meditation.subtitle}
        </p>
        <p className="mt-1 text-[11px] leading-none text-ink-faint">
          {formatMinutesLabel(meditation.durationSeconds)} · {meditation.narrator}
        </p>
      </div>

      <FavoriteButton
        meditationId={meditation.id}
        title={meditation.title}
        className="relative z-10"
      />
    </li>
  );
}
