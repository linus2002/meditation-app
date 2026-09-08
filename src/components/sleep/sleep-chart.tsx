'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import type { SleepNight } from '@/types';

/**
 * Seven vertical bars, one per night. Height encodes hours slept and the fill
 * runs from cyan up to violet so it reads against the same palette as the arc.
 */
export function SleepChart({ nights }: { nights: SleepNight[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const peak = Math.max(...nights.map((night) => night.hours), 8);

  return (
    <div className="rounded-tile bg-[#141733] p-4">
      <div className="flex h-[132px] items-end justify-between gap-2">
        {nights.map((night, index) => {
          const heightPercent = Math.round((night.hours / peak) * 100);
          const isActive = active === index;
          return (
            <button
              key={night.label}
              type="button"
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : index)}
              aria-label={`${night.label}: ${night.hours.toFixed(1)} hours, ${Math.round(
                night.quality * 100,
              )} percent quality`}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span
                className={cn(
                  'text-[10px] tabular-nums transition-opacity',
                  isActive ? 'opacity-100 text-ink' : 'opacity-0',
                )}
              >
                {night.hours.toFixed(1)}h
              </span>
              <span
                className={cn(
                  'w-full rounded-full bg-[linear-gradient(180deg,#8A7AF2_0%,#4FBCE0_55%,#2FE0CB_100%)] transition-all duration-500 ease-out',
                  isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
                )}
                style={{ height: `${heightPercent}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-2">
        {nights.map((night) => (
          <span key={night.label} className="flex-1 text-center text-[10px] text-ink-faint">
            {night.label}
          </span>
        ))}
      </div>
    </div>
  );
}
