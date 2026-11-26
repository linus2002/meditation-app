'use client';

import { ChevronsLeft } from 'lucide-react';

import { useBack } from '@/hooks/use-back';
import { cn } from '@/lib/utils';

/** The header's back control on its own, for a page that lays out its own header. */
export function BackButton({ fallbackHref, className }: { fallbackHref?: string; className?: string }) {
  const goBack = useBack(fallbackHref);
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      className={cn(
        'tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        className,
      )}
    >
      <ChevronsLeft className="h-[22px] w-[22px]" strokeWidth={1.75} />
    </button>
  );
}
