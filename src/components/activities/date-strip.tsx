'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface DateStripProps {
  /** Only the date key and the day number are needed here. */
  days: { date: string; day: number }[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

/**
 * Horizontal day picker. The selected day sits inside a gradient ring; the rest
 * are plain muted numerals, exactly as in the reference.
 */
export function DateStrip({ days, selectedDate, onSelect }: DateStripProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep the active day in view when it changes from outside the strip.
  React.useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedDate]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
    const target = days[(next + days.length) % days.length];
    onSelect(target.date);
  };

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label="Select a day"
      className="rail mt-4 flex gap-[18px] overflow-x-auto px-5"
    >
      {days.map((day, index) => {
        const isSelected = day.date === selectedDate;
        return (
          <button
            key={day.date}
            type="button"
            role="radio"
            data-selected={isSelected}
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(day.date)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              isSelected ? 'font-medium text-ink' : 'font-normal text-ink-faint hover:text-ink-soft',
            )}
          >
            {isSelected ? (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-ring-active p-[1.5px]"
              >
                <span className="block h-full w-full rounded-full bg-canvas" />
              </span>
            ) : null}
            <span className="relative">{day.day}</span>
          </button>
        );
      })}
    </div>
  );
}
