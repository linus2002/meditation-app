import Link from 'next/link';

import { SerenityLogo } from '@/components/onboarding/serenity-mark';
import { formatMinutesLabel } from '@/lib/format';
import type { Meditation } from '@/types';

export function DailyGoalCard({ meditation }: { meditation: Meditation }) {
  return (
    <Link
      href={`/player/${meditation.id}`}
      className="group relative block overflow-hidden rounded-tile border border-overlay/[0.1] bg-canvas-raised transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      {/* The app mark, bled off the right edge, standing in for the artwork. */}
      <SerenityLogo className="absolute -right-6 top-1/2 h-[104px] w-[104px] -translate-y-1/2 transition-transform duration-700 group-hover:scale-105" />

      <div className="relative px-5 py-5">
        <p className="text-label font-normal leading-none text-ink-muted">{meditation.subtitle}</p>
        <p className="mt-2 text-[1.0625rem] font-semibold leading-none tracking-[-0.01em] text-ink">
          {meditation.title}
        </p>
        <p className="mt-2 text-body-sm font-normal leading-none text-ink-soft">
          {formatMinutesLabel(meditation.durationSeconds)}
        </p>
      </div>
    </Link>
  );
}
