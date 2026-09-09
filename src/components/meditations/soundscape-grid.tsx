'use client';

import { AudioWaveform, Bell, CloudMoon, CloudRain, Disc3, Trees, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { VolumeControl } from '@/components/player/volume-control';
import { soundscapeList, type SoundscapeId } from '@/lib/audio/soundscapes';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';

const ICONS: Record<SoundscapeId, LucideIcon> = {
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
 * Every synthesised bed the app can make, playable on their own. Selecting one
 * crossfades to it; selecting the one already sounding stops it — the same
 * contract as the sleep mixer, which offers a subset of these.
 */
export function SoundscapeGrid({ limit }: { limit?: number }) {
  const { playing, play, stop, supported } = useAudio();

  if (!supported) {
    return (
      <div className="rounded-tile bg-[#141733] p-4">
        <p className="text-[12px] leading-relaxed text-ink-muted">
          This browser does not support the Web Audio API, so ambient sound is unavailable.
        </p>
      </div>
    );
  }

  const shown = limit ? soundscapeList.slice(0, limit) : soundscapeList;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {shown.map((meta) => {
          const Icon = ICONS[meta.id];
          const active = playing === meta.id;

          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => (active ? stop(1.5) : void play(meta.id))}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                active ? 'bg-action-pill text-white' : 'bg-[#141733] text-ink hover:bg-white/[0.1]',
              )}
            >
              <Icon
                className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-ink-soft')}
                strokeWidth={1.7}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium leading-tight">
                  {meta.name}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-[10.5px] leading-tight',
                    active ? 'text-white/75' : 'text-ink-faint',
                  )}
                >
                  {active ? 'Playing' : 'Tap to play'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {limit ? null : <VolumeControl className="mt-4" />}
    </div>
  );
}
