'use client';

import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

import { LoopButton } from '@/components/shared/loop-button';
import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onSkip: (deltaSeconds: number) => void;
  /** Shown when given: repeat on or off. */
  loop?: boolean;
  onToggleLoop?: () => void;
  className?: string;
}

export const SKIP_SECONDS = 10;

const sideButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/**
 * The white circular play button, with the quieter controls in a row to its
 * right: back and forward ten seconds, then loop.
 */
export function PlaybackControls({
  isPlaying,
  onToggle,
  onSkip,
  loop,
  onToggleLoop,
  className,
}: PlaybackControlsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-[clamp(14px,5vw,22px)]', className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause session' : 'Play session'}
        className="flex h-[58px] w-[58px] shrink-0 items-center justify-center play-button rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 translate-x-[2px] fill-current" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSkip(-SKIP_SECONDS)}
        aria-label={`Back ${SKIP_SECONDS} seconds`}
        className={sideButton}
      >
        <RotateCcw className="h-[20px] w-[20px]" strokeWidth={1.6} />
      </button>

      <button
        type="button"
        onClick={() => onSkip(SKIP_SECONDS)}
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
        className={sideButton}
      >
        <RotateCw className="h-[20px] w-[20px]" strokeWidth={1.6} />
      </button>

      {onToggleLoop ? <LoopButton loop={loop ?? false} onToggle={onToggleLoop} /> : null}
    </div>
  );
}
