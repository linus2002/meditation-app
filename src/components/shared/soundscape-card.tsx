'use client';

import { AudioWaveform, Bell, CloudMoon, CloudRain, Disc3, Trees, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { soundscapes, type SoundscapeId, type SoundscapeMeta } from '@/lib/audio/soundscapes';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';

export const SOUNDSCAPE_ICONS: Record<SoundscapeId, LucideIcon> = {
  rain: CloudRain,
  ocean: Waves,
  forest: Trees,
  night: CloudMoon,
  bowl: Disc3,
  pad: AudioWaveform,
  drone: Wind,
  chimes: Bell,
};

/**
 * List row for a soundscape, matching the session and story cards.
 *
 * A soundscape has no page of its own to open, so the row is the player: it
 * starts the bed where it stands and stops it on a second tap. That is the
 * whole reason search can offer them at all.
 */
export function SoundscapeCard({ meta }: { meta: SoundscapeMeta }) {
  const { playing, play, stop, supported } = useAudio();
  const Icon = SOUNDSCAPE_ICONS[meta.id];
  const active = playing === meta.id;

  return (
    <li>
      <button
        type="button"
        disabled={!supported}
        onClick={() => (active ? stop(1.5) : void play(meta.id))}
        aria-pressed={active}
        className={cn(
          'flex w-full items-center gap-3.5 rounded-tile p-3 text-left transition-transform duration-200',
          'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
          'disabled:pointer-events-none disabled:opacity-50',
          active ? 'bg-action-pill' : 'bg-surface',
        )}
      >
        <span
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
            active ? 'bg-overlay/20' : 'bg-overlay/[0.06]',
          )}
        >
          <Icon
            className={cn('h-[22px] w-[22px]', active ? 'text-white' : 'text-ink-soft')}
            strokeWidth={1.7}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[14px] font-semibold leading-tight',
              active ? 'text-white' : 'text-ink',
            )}
          >
            {meta.name}
          </span>
          <span
            className={cn(
              'mt-0.5 block truncate text-[11.5px] leading-tight',
              active ? 'text-white/75' : 'text-ink-muted',
            )}
          >
            {meta.description}
          </span>
          <span
            className={cn(
              'mt-1 block text-[11px] leading-none',
              active ? 'text-white/75' : 'text-ink-faint',
            )}
          >
            {!supported ? 'Unavailable in this browser' : active ? 'Playing — tap to stop' : 'Tap to play'}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Re-exported so callers can look a scape up by id without a second import. */
export { soundscapes };
