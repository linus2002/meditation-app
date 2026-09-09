'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RatingStarsProps {
  /** 1-5, or undefined when this session has not been rated. */
  value: number | undefined;
  /** Omit to render a read-only score. */
  onChange?: (score: number) => void;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SCORES = [1, 2, 3, 4, 5];

/**
 * Five stars, the reader's own. There is no server behind this app, so there is
 * no average to show and none is implied: an unrated session shows five empty
 * stars rather than a number somebody else supposedly gave it.
 *
 * Tapping the score already set clears it, which is the only way back out of a
 * rating given by accident.
 */
export function RatingStars({
  value,
  onChange,
  label = 'Rate this session',
  size = 'md',
  className,
}: RatingStarsProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const readOnly = !onChange;
  const shown = hovered ?? value ?? 0;
  const box = size === 'sm' ? 'h-3.5 w-3.5' : 'h-6 w-6';

  if (readOnly) {
    return (
      <span
        className={cn('inline-flex items-center gap-0.5', className)}
        aria-label={value ? `Rated ${value} out of 5` : 'Not rated'}
      >
        {SCORES.map((score) => (
          <Star
            key={score}
            aria-hidden="true"
            className={cn(box, score <= shown ? 'fill-aurora-lime text-aurora-lime' : 'text-ink-faint')}
            strokeWidth={score <= shown ? 0 : 1.6}
          />
        ))}
      </span>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-1', className)}
      onMouseLeave={() => setHovered(null)}
    >
      {SCORES.map((score) => {
        const filled = score <= shown;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} out of 5`}
            tabIndex={value === score || (value === undefined && score === 1) ? 0 : -1}
            onClick={() => onChange(score)}
            onMouseEnter={() => setHovered(score)}
            onFocus={() => setHovered(score)}
            onBlur={() => setHovered(null)}
            className="rounded-md p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Star
              aria-hidden="true"
              className={cn(
                box,
                'transition-colors',
                filled ? 'fill-aurora-lime text-aurora-lime' : 'text-ink-faint',
              )}
              strokeWidth={filled ? 0 : 1.6}
            />
          </button>
        );
      })}
    </div>
  );
}
