'use client';

import * as React from 'react';

import { moodLevels } from '@/data/moods';
import { handleRovingKey } from '@/lib/roving';
import { cn } from '@/lib/utils';

interface MoodScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  /** Visually hide the label, keeping it for screen readers. */
  hideLabel?: boolean;
  /** Smaller faces with no words under them, for tight spaces like the player. */
  compact?: boolean;
  className?: string;
}

/**
 * The five-point mood scale, from Struggling to Great. A radiogroup with arrow
 * keys, like the reflection scale, with a face for each point.
 */
export function MoodScale({ value, onChange, label, hideLabel, compact, className }: MoodScaleProps) {
  const labelId = React.useId();

  return (
    <div className={className}>
      <p id={labelId} className={cn('text-label leading-none text-ink-muted', hideLabel && 'sr-only')}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={cn('flex items-start justify-between gap-1', !hideLabel && 'mt-2.5')}
      >
        {moodLevels.map((level, index) => {
          const selected = value === level.value;
          const Icon = level.icon;
          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={level.label}
              tabIndex={selected || (value === null && index === 0) ? 0 : -1}
              onClick={() => onChange(level.value)}
              onKeyDown={(event) =>
                handleRovingKey(event, index, moodLevels.length, (next) => onChange(moodLevels[next].value))
              }
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-full transition-all duration-150',
                  compact ? 'h-9 w-9' : 'h-11 w-11',
                  selected ? 'scale-105 bg-aurora-blue text-white' : 'bg-overlay/[0.06] text-ink-muted group-hover:text-ink',
                )}
              >
                <Icon className={compact ? 'h-[18px] w-[18px]' : 'h-5 w-5'} strokeWidth={1.8} aria-hidden="true" />
              </span>
              {compact ? null : (
                <span
                  className={cn('text-label leading-none transition-colors', selected ? 'text-ink' : 'text-ink-faint')}
                >
                  {level.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
