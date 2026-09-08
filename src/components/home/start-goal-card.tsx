import Link from 'next/link';
import { Play } from 'lucide-react';

import type { Meditation } from '@/types';

/**
 * Copy is transcribed verbatim from the reference artwork, including the
 * "sessiom" spelling on the third line.
 */
export function StartGoalCard({ meditation }: { meditation: Meditation }) {
  return (
    <Link
      href={`/player/${meditation.id}`}
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-tile bg-canvas-slate px-5 py-5 shadow-tile transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <div>
        <p className="text-[11px] font-normal leading-none text-ink-muted">{meditation.subtitle}</p>
        <p className="mt-2 text-[16px] font-bold leading-none tracking-[-0.01em] text-ink">
          {meditation.title}
        </p>
        <p className="mt-2 text-[10px] font-normal leading-none text-ink-muted">
          Ready to start your first sessiom
        </p>
      </div>

      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white transition-transform duration-200 group-hover:scale-105"
      >
        <Play className="h-4 w-4 translate-x-[1px] fill-canvas-deep text-canvas-deep" />
      </span>
    </Link>
  );
}
