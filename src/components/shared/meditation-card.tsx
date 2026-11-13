import Image from 'next/image';
import Link from 'next/link';

import { FavoriteButton } from '@/components/shared/favorite-button';
import { formatMinutesLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Meditation } from '@/types';

/**
 * List row used across discovery, sleep and saved sessions. The thumbnail is
 * the session's own artwork, tinted so white type stays legible over any photo.
 *
 * `plain` drops the box, the tint and the heart, and squares off the artwork,
 * matching the story rows (the Sleep screen). Elsewhere, such as Saved, the
 * heart stays, because there it is how a session is taken off the list.
 */
export function MeditationCard({ meditation, plain = false }: { meditation: Meditation; plain?: boolean }) {
  return (
    <li
      className={cn(
        'group relative flex items-center gap-3.5',
        plain ? 'py-0.5' : 'rounded-tile bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5',
      )}
    >
      <span
        className={cn(
          'relative h-14 w-14 shrink-0 overflow-hidden',
          plain ? 'rounded-[6px] transition-opacity group-hover:opacity-90' : 'rounded-xl',
        )}
      >
        <Image
          src={meditation.image}
          alt=""
          fill
          sizes="56px"
          placeholder="blur"
          className="object-cover"
        />
        {plain ? null : (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(150deg,rgba(10,12,36,0.05)_0%,rgba(10,12,36,0.35)_100%)]"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/player/${meditation.id}`}
          className={cn(
            "static before:absolute before:inset-0 before:content-[''] focus-visible:outline-none",
            plain
              ? 'before:rounded-[6px] focus-visible:before:ring-2 focus-visible:before:ring-focus/70'
              : 'before:rounded-tile focus-visible:ring-2 focus-visible:ring-focus/70',
          )}
        >
          <p
            className={cn(
              'truncate text-body-sm font-semibold leading-tight text-ink',
              plain && 'group-hover:underline group-hover:underline-offset-2',
            )}
          >
            {meditation.title}
          </p>
        </Link>
        <p className="mt-0.5 truncate text-label leading-tight text-ink-muted">
          {meditation.subtitle}
        </p>
        <p className="mt-1 text-label leading-none text-ink-faint">
          {formatMinutesLabel(meditation.durationSeconds)} · {meditation.narrator}
        </p>
      </div>

      {plain ? null : (
        <FavoriteButton meditationId={meditation.id} title={meditation.title} className="relative z-10" />
      )}
    </li>
  );
}
