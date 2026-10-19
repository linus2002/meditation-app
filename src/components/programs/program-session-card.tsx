import Image from 'next/image';
import Link from 'next/link';

import { FavoriteButton } from '@/components/shared/favorite-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCategory } from '@/data/categories';
import type { Meditation } from '@/types';

interface ProgramSessionCardProps {
  session: Meditation;
  /** 1-based place in the programme, shown on the artwork. */
  position: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * One session in a programme, as a tall artwork card: its place in the
 * programme in a pill at the top, the save control opposite, and the title
 * over the foot of the image. The narrator, category and length sit beneath,
 * so the artwork carries only what you read first.
 */
export function ProgramSessionCard({ session, position }: ProgramSessionCardProps) {
  const category = getCategory(session.category)?.name ?? session.category;

  return (
    <li className="relative">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-surface">
        <Image
          src={session.image}
          alt=""
          fill
          sizes="(max-width: 430px) 45vw, 195px"
          placeholder="blur"
          className="object-cover"
        />
        {/* Darkens the foot of the artwork so the title reads over any photograph. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0)_35%,rgba(0,0,0,0.7)_100%)]"
        />

        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/35 px-2.5 py-1 text-[0.625rem] font-semibold uppercase leading-none tracking-[0.06em] text-white backdrop-blur-sm">
          {`Session ${position}`}
        </span>

        <Link
          href={`/player/${session.id}`}
          className="absolute inset-0 flex items-end p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus/70"
        >
          <span className="line-clamp-2 text-[0.9375rem] font-semibold leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
            {session.title}
          </span>
        </Link>

        <FavoriteButton
          meditationId={session.id}
          title={session.title}
          className="absolute right-2 top-2 z-10 bg-black/35 backdrop-blur-sm"
        />
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-label leading-tight text-ink-soft">with {session.narrator}</p>
          <p className="mt-1 truncate text-[0.625rem] font-medium uppercase leading-none tracking-[0.08em] text-ink-faint">
            {category} · {Math.round(session.durationSeconds / 60)} min
          </p>
        </div>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[0.625rem]">{initials(session.narrator)}</AvatarFallback>
        </Avatar>
      </div>
    </li>
  );
}
