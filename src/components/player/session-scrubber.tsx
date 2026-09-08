'use client';

import { Slider } from '@/components/ui/slider';
import { formatClock } from '@/lib/format';

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
        onValueChange={([next]) => onSeek(next)}
      />
      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-ink-muted">
        <span>{formatClock(elapsed)}</span>
        <span>-{formatClock(duration - elapsed)}</span>
      </div>
    </div>
  );
}
