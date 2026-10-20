import Link from 'next/link';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The pill-shaped search bar on the home and discover screens. It is a link,
 * not a field: tapping it opens the search screen, which owns the real input,
 * so there is exactly one place where searching happens.
 */
export function SearchBarLink({ className }: { className?: string }) {
  return (
    <Link
      href="/search"
      className={cn(
        'flex h-12 items-center gap-3 rounded-full bg-overlay/[0.03] px-4 text-body-sm text-ink-faint transition-colors hover:bg-overlay/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.7} />
      Search sessions, stories and sounds
    </Link>
  );
}
