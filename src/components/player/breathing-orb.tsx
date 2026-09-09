'use client';

import { cn } from '@/lib/utils';
import type { BreathState } from '@/hooks/use-breath';

interface BreathingOrbProps {
  breath: BreathState;
  /** Idle orbs settle at their mid size and stop following the phase. */
  isPlaying: boolean;
  className?: string;
}

/**
 * The pacer for a session. Scale is driven by the derived breath expansion
 * rather than a CSS keyframe, so the orb and the countdown never disagree.
 */
export function BreathingOrb({ breath, isPlaying, className }: BreathingOrbProps) {
  const expansion = isPlaying ? breath.expansion : 0.5;
  const scale = 0.66 + expansion * 0.34;

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Static guide rings so the orb has something to travel against. */}
      <span
        aria-hidden="true"
        className="absolute h-full w-full rounded-full border border-overlay/[0.07]"
      />
      <span
        aria-hidden="true"
        className="absolute h-[78%] w-[78%] rounded-full border border-overlay/[0.05]"
      />

      <span
        aria-hidden="true"
        className="absolute h-full w-full rounded-full bg-[radial-gradient(circle,rgba(139,140,240,0.35)_0%,rgba(139,140,240,0)_68%)] blur-xl transition-transform duration-1000 ease-out"
        style={{ transform: `scale(${0.8 + expansion * 0.3})` }}
      />

      <span
        aria-hidden="true"
        className="absolute rounded-full bg-[conic-gradient(from_210deg,#2FE0CB,#8A7AF2,#F48FC8,#2FE0CB)] opacity-90 transition-transform ease-out [transition-duration:900ms]"
        style={{ height: '82%', width: '82%', transform: `scale(${scale})` }}
      />

      <span
        aria-hidden="true"
        className="absolute rounded-full bg-canvas/70 backdrop-blur-[2px] transition-transform ease-out [transition-duration:900ms]"
        style={{ height: '82%', width: '82%', transform: `scale(${scale - 0.09})` }}
      />

      <div className="relative z-10 flex flex-col items-center gap-1" aria-live="polite">
        <p className="text-[clamp(12px,4vw,15px)] font-medium tracking-[0.02em] text-ink">
          {isPlaying ? breath.phase.label : 'Ready when you are'}
        </p>
        {isPlaying ? (
          <p className="text-[clamp(26px,8.7vw,34px)] font-light leading-none tabular-nums text-ink">
            {breath.secondsLeft}
          </p>
        ) : null}
      </div>
    </div>
  );
}
