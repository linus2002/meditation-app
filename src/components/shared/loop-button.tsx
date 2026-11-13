'use client';

import { Repeat } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Turns repeat on or off for whatever is playing. Icon only, sized and placed
 * like the skip controls beside it; when on it fills with the action colour,
 * so its state reads at a glance. Screen readers hear the state in words.
 */
export function LoopButton({
  loop,
  onToggle,
  className,
}: {
  loop: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={loop}
      aria-label={loop ? 'Loop on' : 'Loop off'}
      title={loop ? 'Loop on' : 'Loop off'}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        loop
          ? 'bg-aurora-blue text-white'
          : 'text-ink-muted hover:bg-overlay/[0.06] hover:text-ink',
        className,
      )}
    >
      <Repeat className="h-[20px] w-[20px]" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
