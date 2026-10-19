'use client';

import { Slider } from '@/components/ui/slider';
import { formatClock, formatSpokenTime } from '@/lib/format';

interface SessionScrubberProps {
  elapsed: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

/** Draggable position bar with the elapsed and remaining clocks beneath it. */
export function SessionScrubber({ elapsed, duration, onSeek }: SessionScrubberProps) {
  return (
    <div className="w-full">
      <Slider
        value={[Math.min(elapsed, duration)]}
        max={duration}
        step={1}
        aria-label="Session position"
        aria-valuetext={`${formatSpokenTime(elapsed)} of ${formatSpokenTime(duration)}`}
        onValueChange={([next]) => onSeek(next)}
      />
      {/* Pulled up: the slider's 44px touch row is taller than the track it draws. */}
      <div className="-mt-2 flex items-center justify-between text-label tabular-nums text-ink-muted">
        <span>{formatClock(elapsed)}</span>
        <span>-{formatClock(duration - elapsed)}</span>
      </div>
    </div>
  );
}
