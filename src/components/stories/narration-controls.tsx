'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import type { NarrationState } from '@/hooks/use-narration';
import { segmentAfterSeconds, totalLength, type StorySegment } from '@/lib/story';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

const SKIP_SECONDS = 15;

interface NarrationControlsProps {
  narration: NarrationState;
  segments: StorySegment[];
  /** Estimated whole-story length, for the clocks either side of the bar. */
  totalSeconds: number;
  /**
   * Called instead of `play()` when starting from stopped, so the screen can
   * unlock audio from the gesture and bring in the ambient bed first.
   */
  onStart?: () => void;
  className?: string;
}

/**
 * Transport for the read-aloud player.
 *
 * Speech synthesis has no timeline of its own, so position is measured in
 * characters read rather than seconds elapsed. The clocks are derived from
 * that fraction, which is why they are an estimate — the true pace depends on
 * the device voice.
 */
export function NarrationControls({
  narration,
  segments,
  totalSeconds,
  onStart,
  className,
}: NarrationControlsProps) {
  const total = totalLength(segments);
  const current = segments[narration.index];
  const readChars = current ? current.offset : 0;
  const progress = total > 0 ? Math.min(1, readChars / total) : 0;

  const elapsed = Math.round(progress * totalSeconds);
  const playing = narration.speaking && !narration.paused;

  const VolumeIcon = narration.volume === 0 ? VolumeX : narration.volume < 0.45 ? Volume1 : Volume2;

  const skip = (seconds: number) =>
    narration.seekTo(segmentAfterSeconds(segments, narration.index, seconds, narration.rate));

  return (
    <div className={cn('w-full', className)}>
      <Slider
        value={[narration.index]}
        max={Math.max(0, segments.length - 1)}
        step={1}
        aria-label="Position in the story"
        aria-valuetext={`Sentence ${narration.index + 1} of ${segments.length}`}
        onValueChange={([next]) => narration.seekTo(next)}
      />

      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-ink-muted">
        <span>{formatClock(elapsed)}</span>
        <span>about {formatClock(Math.max(0, totalSeconds - elapsed))} left</span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-[clamp(24px,9.2vw,36px)]">
        <button
          type="button"
          onClick={() => skip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <RotateCcw className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (playing) narration.pause();
            else if (narration.paused) narration.resume();
            else if (onStart) onStart();
            else narration.play();
          }}
          disabled={!narration.supported}
          aria-label={playing ? 'Pause narration' : 'Play narration'}
          className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-ink text-canvas shadow-[0_10px_30px_-8px_rgba(255,255,255,0.35)] transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          {playing ? (
            <Pause className="h-7 w-7 fill-canvas-deep" />
          ) : (
            <Play className="h-7 w-7 translate-x-[2px] fill-canvas-deep" />
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <RotateCw className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => narration.setVolume(narration.volume === 0 ? 1 : 0)}
          aria-label={narration.volume === 0 ? 'Unmute narration' : 'Mute narration'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <VolumeIcon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </button>

        <Slider
          value={[Math.round(narration.volume * 100)]}
          max={100}
          step={1}
          aria-label="Narration volume"
          onValueChange={([next]) => narration.setVolume(next / 100)}
          className="flex-1"
        />
      </div>

      <p className="mt-2.5 text-[10.5px] leading-relaxed text-ink-faint">
        Volume and pace apply from the next sentence.
      </p>
    </div>
  );
}
