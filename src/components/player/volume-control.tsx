'use client';

import { Volume1, Volume2, VolumeX } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAudio } from '@/providers/audio-provider';

/**
 * Mute toggle plus level slider for the session bed. Both act on the engine's
 * master gain, so they affect the scape, the breath cues and the closing bell
 * together.
 */
export function VolumeControl({ className }: { className?: string }) {
  const { volume, muted, setVolume, toggleMuted, supported } = useAudio();

  if (!supported) return null;

  const Icon = muted || volume === 0 ? VolumeX : volume < 0.45 ? Volume1 : Volume2;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={muted}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>

      <Slider
        value={[muted ? 0 : Math.round(volume * 100)]}
        max={100}
        step={1}
        aria-label="Sound volume"
        onValueChange={([next]) => setVolume(next / 100)}
        className="flex-1"
      />
    </div>
  );
}
