'use client';

import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  onSkip: (deltaSeconds: number) => void;
  className?: string;
}

const SKIP_SECONDS = 15;

/**
 * The white circular transport from the reference card, flanked by two quiet
 * fifteen-second skip controls.
 */
export function PlaybackControls({
  isPlaying,
  onToggle,
  onSkip,
  className,
}: PlaybackControlsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-[clamp(24px,9.2vw,36px)]', className)}>
      <button
        type="button"
        onClick={() => onSkip(-SKIP_SECONDS)}
        aria-label={`Rewind ${SKIP_SECONDS} seconds`}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <RotateCcw className="h-[22px] w-[22px]" strokeWidth={1.6} />
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause session' : 'Play session'}
        className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-ink text-canvas shadow-[0_16px_40px_-12px_rgba(255,255,255,0.35)] transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6 fill-canvas-deep" />
        ) : (
          <Play className="h-6 w-6 translate-x-[2px] fill-canvas-deep" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSkip(SKIP_SECONDS)}
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <RotateCw className="h-[22px] w-[22px]" strokeWidth={1.6} />
      </button>
    </div>
  );
}
