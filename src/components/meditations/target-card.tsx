import Link from 'next/link';
import { ChevronRight, Target } from 'lucide-react';

/**
 * The row at the top of the library pointing at the activities screen, where
 * the daily goal and the streak actually live.
 */
export function TargetCard() {
  return (
    <Link
      href="/activities"
      className="flex items-center gap-3.5 rounded-tile bg-[#141733] p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aurora-lime/15">
        <Target className="h-6 w-6 text-aurora-lime" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight text-ink">
          Set a Meditation Target
        </span>
        <span className="mt-0.5 block text-[12px] leading-tight text-ink-muted">
          Track your meditation practice
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" strokeWidth={1.8} />
    </Link>
  );
}
