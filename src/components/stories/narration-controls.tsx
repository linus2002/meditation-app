'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import type { StoryPlayer } from '@/hooks/use-story-player';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

const SKIP_SECONDS = 15;

interface NarrationControlsProps {
  player: StoryPlayer;
  /**
   * Called instead of `play()` when starting from stopped, so the screen can
   * unlock audio from the gesture and bring in the ambient bed first.
   */
  onStart?: () => void;
  className?: string;
}

/**
 * Transport for the story player.
 *
 * A recorded story has a real timeline. The device voice has none, so its
 * position is measured in sentences and its clocks are derived from that —
 * which is why they read "about" — since the true pace depends on the voice.
 */
export function NarrationControls({ player, onStart, className }: NarrationControlsProps) {
  const playing = player.speaking && !player.paused;
  const left = Math.max(0, player.total - player.elapsed);

  return (
    <div className={cn('w-full', className)}>
      <Slider
        value={[player.seek.value]}
        max={player.seek.max}
        step={1}
        aria-label="Position in the story"
        aria-valuetext={
          player.exact
            ? `${formatClock(player.elapsed)} of ${formatClock(player.total)}`
            : `Sentence ${player.seek.value + 1} of ${player.seek.max + 1}`
        }
        onValueChange={([next]) => player.seekTo(next)}
      />

      <div className="mt-2 flex items-center justify-between text-label tabular-nums text-ink-muted">
        <span>{formatClock(player.elapsed)}</span>
        <span>{player.exact ? `-${formatClock(left)}` : `about ${formatClock(left)} left`}</span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-[clamp(24px,9.2vw,36px)]">
        <button
          type="button"
          onClick={() => player.skip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <RotateCcw className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (playing) player.pause();
            else if (player.paused) player.resume();
            else if (onStart) onStart();
            else player.play();
          }}
          disabled={!player.supported}
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
          onClick={() => player.skip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <RotateCw className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
