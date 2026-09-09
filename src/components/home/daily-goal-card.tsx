import Link from 'next/link';

import { formatMinutesLabel } from '@/lib/format';
import type { Meditation } from '@/types';

/**
 * The concentric ring bloom on the right of the card is a single blurred
 * radial gradient rather than stacked elements, which keeps it cheap to paint.
 */
const RING_BLOOM =
  'radial-gradient(circle, #131C4E 0%, #131C4E 16%, #2C93B8 22%, #4A86D2 31%, #C56AAE 40%, #A874CC 49%, #3AAFC4 58%, #5F8FD2 68%, #232C5C 79%, rgba(18,22,54,0) 93%)';

export function DailyGoalCard({ meditation }: { meditation: Meditation }) {
  return (
    <Link
      href={`/player/${meditation.id}`}
      className="group relative block overflow-hidden rounded-tile bg-surface shadow-tile transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      <div
        aria-hidden="true"
        className="absolute -right-10 top-1/2 h-[152px] w-[152px] -translate-y-1/2 rounded-full opacity-80 blur-[7px] transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: RING_BLOOM }}
      />

      <div className="relative px-5 py-5">
        <p className="text-[11px] font-normal leading-none text-ink-muted">{meditation.subtitle}</p>
        <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.01em] text-ink">
          {meditation.title}
        </p>
        <p className="mt-2 text-[13px] font-normal leading-none text-ink-soft">
          {formatMinutesLabel(meditation.durationSeconds)}
        </p>
      </div>
    </Link>
  );
}
