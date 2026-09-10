import Link from 'next/link';

import type { Meditation } from '@/types';

/**
 * Copy is transcribed verbatim from the reference artwork, including the
 * "sessiom" spelling on the third line.
 */
export function StartGoalCard({ meditation }: { meditation: Meditation }) {
  return (
    <Link
      href={`/player/${meditation.id}`}
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-tile bg-surface px-5 py-5 shadow-tile transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
    >
      <div>
        <p className="text-[11px] font-normal leading-none text-ink-muted">{meditation.subtitle}</p>
        <p className="mt-2 text-[16px] font-semibold leading-none tracking-[-0.01em] text-ink">
          {meditation.title}
        </p>
        <p className="mt-2 text-[10px] font-normal leading-none text-ink-muted">
          Ready to start your first sessiom
        </p>
      </div>

      {/* The bare glyph, carrying the mark's gradient — no disc behind it. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-12 w-12 shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="start-goal-play" x1="18%" y1="8%" x2="82%" y2="92%">
            <stop offset="0%" stopColor="#F48FC8" />
            <stop offset="38%" stopColor="#B98CEE" />
            <stop offset="66%" stopColor="#7C7BF0" />
            <stop offset="100%" stopColor="#2FE0CB" />
          </linearGradient>
        </defs>
        <path
          d="M8 5.2 19 12 8 18.8Z"
          fill="url(#start-goal-play)"
          stroke="url(#start-goal-play)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
