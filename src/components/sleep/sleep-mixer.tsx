'use client';

import { CloudMoon, CloudRain, Waves, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { VolumeControl } from '@/components/player/volume-control';
import { sleepSoundscapeIds, soundscapes, type SoundscapeId } from '@/lib/audio/soundscapes';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';

/** Only the scapes offered in the mixer need an icon. */
const ICONS: Partial<Record<SoundscapeId, LucideIcon>> = {
  rain: CloudRain,
  ocean: Waves,
  night: CloudMoon,
  drone: Wind,
};

/**
 * Ambient sound picker for the sleep screen. Selecting a sound crossfades to
 * it; selecting the one already playing stops it. The wind-down timer fades
 * whatever is playing out to silence when it finishes.
 */
export function SleepMixer() {
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

  return (
    <div className="rounded-tile bg-[#141733] p-4">
      <div className="grid grid-cols-2 gap-2.5">
        {sleepSoundscapeIds.map((id) => {
          const meta = soundscapes[id];
          const Icon = ICONS[id] ?? Wind;
          const active = playing === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => (active ? stop(1.5) : void play(id))}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                active ? 'bg-action-pill text-white' : 'bg-white/[0.06] text-ink hover:bg-white/[0.1]',
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
                    'mt-0.5 block text-[10.5px] leading-tight',
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

      <VolumeControl className="mt-4" />
    </div>
  );
}
