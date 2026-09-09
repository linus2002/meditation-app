'use client';

import * as React from 'react';

import { relativeDayLabel } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { SleepNight } from '@/types';

/**
 * Seven vertical bars, one per night. Height encodes hours slept and the fill
 * runs from cyan up to violet so it reads against the same palette as the arc.
 *
 * A night with no entry is drawn as a hairline stub rather than a zero-hour
 * bar: nothing was recorded, which is not the same claim as no sleep.
 */
export function SleepChart({ nights }: { nights: SleepNight[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const peak = Math.max(...nights.map((night) => night.hours), 8);
  const anyLogged = nights.some((night) => night.logged);

  return (
    <div className="rounded-tile bg-surface p-4">
      <div className="flex h-[132px] items-end justify-between gap-2">
        {nights.map((night, index) => {
          const heightPercent = night.logged ? Math.round((night.hours / peak) * 100) : 0;
          const isActive = active === index;
          return (
            <button
              key={night.key}
              type="button"
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : index)}
              aria-label={
                night.logged
                  ? `${relativeDayLabel(night.key)}: ${night.hours.toFixed(1)} hours`
                  : `${relativeDayLabel(night.key)}: not logged`
              }
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <span
                className={cn(
                  'text-[10px] tabular-nums transition-opacity',
                  isActive ? 'text-ink opacity-100' : 'opacity-0',
                )}
              >
                {night.logged ? `${night.hours.toFixed(1)}h` : '—'}
              </span>
              {night.logged ? (
                <span
                  className={cn(
                    'w-full rounded-full bg-[linear-gradient(180deg,#8A7AF2_0%,#4FBCE0_55%,#2FE0CB_100%)] transition-all duration-500 ease-out',
                    isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
                  )}
                  style={{ height: `${heightPercent}%` }}
                />
              ) : (
                <span className="h-[3px] w-full rounded-full bg-overlay/15" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-2">
        {nights.map((night) => (
          <span key={night.key} className="flex-1 text-center text-[10px] text-ink-faint">
            {night.label}
          </span>
        ))}
      </div>

      {!anyLogged ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
          No nights logged yet. Add last night above and the week fills in from there.
        </p>
      ) : null}
    </div>
  );
}
