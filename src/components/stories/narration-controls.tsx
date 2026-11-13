'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

import { LoopButton } from '@/components/shared/loop-button';
import { Slider } from '@/components/ui/slider';
import type { StoryPlayer } from '@/hooks/use-story-player';
import { formatClock } from '@/lib/format';
import { cn } from '@/lib/utils';

const SKIP_SECONDS = 10;

const sideButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

interface NarrationControlsProps {
  player: StoryPlayer;
  /**
   * Called instead of `play()` when starting from stopped, so the screen can
   * unlock audio from the gesture and bring in the ambient bed first.
   */
  onStart?: () => void;
  /** Shown when given: repeat on or off. */
  loop?: boolean;
  onToggleLoop?: () => void;
  className?: string;
}

/**
 * Transport for the story player.
 *
 * A recorded story has a real timeline. The device voice has none, so its
 * position is measured in sentences and its clocks are derived from that —
 * which is why they read "about" — since the true pace depends on the voice.
 */
export function NarrationControls({
  player,
  onStart,
  loop,
  onToggleLoop,
  className,
}: NarrationControlsProps) {
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

      <div className="mt-5 flex items-center justify-center gap-[clamp(14px,5vw,22px)]">
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
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center play-button rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          {playing ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 translate-x-[2px] fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={() => player.skip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className={sideButton}
        >
          <RotateCcw className="h-[20px] w-[20px]" strokeWidth={1.6} />
        </button>

        <button
          type="button"
          onClick={() => player.skip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className={sideButton}
        >
          <RotateCw className="h-[20px] w-[20px]" strokeWidth={1.6} />
        </button>

        {onToggleLoop ? <LoopButton loop={loop ?? false} onToggle={onToggleLoop} /> : null}
      </div>
    </div>
  );
}
