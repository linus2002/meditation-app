'use client';

import * as React from 'react';

import { reflectionWeights } from '@/data/reflections';
import { cn } from '@/lib/utils';

interface WeightScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Rendered as the group label; keep it about the thought, not the person. */
  label?: string;
  className?: string;
}

/**
 * Five-point scale for how a reflection sat. A radiogroup with arrow-key
 * support, matching the day picker on the activities screen.
 */
export function WeightScale({
  value,
  onChange,
  label = 'How did that sit?',
  className,
}: WeightScaleProps) {
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
    const clamped = Math.min(reflectionWeights.length - 1, Math.max(0, next));
    onChange(reflectionWeights[clamped].value);
  };

  return (
    <div className={className}>
      <p id="weight-scale-label" className="text-[11.5px] leading-none text-ink-muted">
        {label}
      </p>

      <div
        role="radiogroup"
        aria-labelledby="weight-scale-label"
        className="mt-2.5 flex items-center justify-between gap-1"
      >
        {reflectionWeights.map((weight, index) => {
          const isSelected = value === weight.value;
          return (
            <button
              key={weight.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={weight.label}
              tabIndex={isSelected || (value === null && index === 0) ? 0 : -1}
              onClick={() => onChange(weight.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <span
                className={cn(
                  'h-3.5 w-3.5 rounded-full transition-all duration-150',
                  isSelected
                    ? 'scale-110 bg-action-pill'
                    : 'bg-overlay/15 group-hover:bg-overlay/30',
                )}
              />
              <span
                className={cn(
                  'text-[9.5px] leading-none transition-colors',
                  isSelected ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {weight.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
