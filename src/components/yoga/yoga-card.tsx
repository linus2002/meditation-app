import Image from 'next/image';
import Link from 'next/link';

import type { YogaSession } from '@/data/yoga';
import { formatMinutesLabel } from '@/lib/format';
import { totalSeconds } from '@/lib/yoga';

/** List row for a yoga session, matching the meditation rows in the library. */
export function YogaCard({ session }: { session: YogaSession }) {
  return (
    <li className="relative flex items-center gap-3.5 rounded-tile bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
        <Image src={session.image} alt="" fill sizes="56px" placeholder="blur" className="object-cover" />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(10,12,36,0.05)_0%,rgba(10,12,36,0.35)_100%)]"
        />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/yoga/${session.id}`}
          className="static before:absolute before:inset-0 before:rounded-tile before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">{session.title}</p>
        </Link>
        <p className="mt-0.5 truncate text-[11.5px] leading-tight text-ink-muted">{session.subtitle}</p>
        <p className="mt-1 text-[11px] leading-none text-ink-faint">
          {formatMinutesLabel(totalSeconds(session.poses))} · {session.level} ·{' '}
          {session.poses.length} poses
        </p>
      </div>
    </li>
  );
}
