'use client';

import * as React from 'react';

import { breathCycleSeconds } from '@/data/meditations';
import type { BreathPhase } from '@/types';

export interface BreathState {
  phase: BreathPhase;
  phaseIndex: number;
  /** 0–1 through the current phase. */
  phaseProgress: number;
  /** Whole seconds left in the phase, shown as a countdown. */
  secondsLeft: number;
  /** 0–1 fullness of the lungs, used to scale the orb. */
  expansion: number;
}

const fallbackPhase: BreathPhase = { label: 'Breathe in', seconds: 4 };

/**
 * Derives the breathing phase from the session clock so the orb, the label and
 * the countdown can never drift apart from playback.
 */
export function useBreath(pattern: BreathPhase[], elapsedSeconds: number): BreathState {
  return React.useMemo(() => {
    const phases = pattern.length > 0 ? pattern : [fallbackPhase];
    const cycle = breathCycleSeconds(phases);
    const position = cycle > 0 ? elapsedSeconds % cycle : 0;

    let cursor = 0;
    let index = 0;
    for (let i = 0; i < phases.length; i += 1) {
      const phase = phases[i];
      if (position < cursor + phase.seconds) {
        index = i;
        break;
      }
      cursor += phase.seconds;
      index = i;
    }

    const phase = phases[index];
    const into = Math.min(Math.max(position - cursor, 0), phase.seconds);
    const phaseProgress = phase.seconds > 0 ? into / phase.seconds : 0;

    // Holds keep the previous fullness; inhales fill, exhales empty.
    const label = phase.label.toLowerCase();
    let expansion: number;
    if (label.includes('in')) {
      expansion = phaseProgress;
    } else if (label.includes('out')) {
      expansion = 1 - phaseProgress;
    } else {
      const previous = phases[(index - 1 + phases.length) % phases.length];
      expansion = previous.label.toLowerCase().includes('in') ? 1 : 0;
    }

    return {
      phase,
      phaseIndex: index,
      phaseProgress,
      secondsLeft: Math.max(1, Math.ceil(phase.seconds - into)),
      expansion,
    };
  }, [pattern, elapsedSeconds]);
}
