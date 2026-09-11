'use client';

import * as React from 'react';

import { measureClockSkew } from '@/lib/circles/api';
import { currentOrNextOccurrence, livePhase } from '@/lib/circles/schedule';
import type { CircleSchedule, LivePhase, Occurrence } from '@/lib/circles/types';

/** Same cadence as `usePlayer`, so the orb moves as smoothly as in a solo sit. */
const TICK_MS = 250;

export interface SyncedSession {
  /** Corrected current time, epoch ms. */
  now: number;
  occurrence: Occurrence | null;
  phase: LivePhase;
  /** Seconds into the shared session, clamped to its length. */
  elapsed: number;
}

/**
 * The circle's shared clock.
 *
 * Nobody has a play button. The session begins at its scheduled instant for
 * everyone, and elapsed time is simply "now minus the start", so a member
 * who arrives four minutes late lands on the same breath as everyone else.
 *
 * "Now" is corrected by the device's measured offset from the server's clock,
 * so a phone that runs a minute fast does not sit a minute ahead.
 */
export function useSyncedSession(schedule: CircleSchedule | null): SyncedSession {
  const [skew, setSkew] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let cancelled = false;
    void measureClockSkew()
      .then((value) => {
        if (!cancelled) setSkew(value);
      })
      .catch(() => {
        // Uncorrected is still close enough to sit together.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + skew), TICK_MS);
    setNow(Date.now() + skew);
    return () => window.clearInterval(timer);
  }, [skew]);

  // The occurrence is held once found, so the session does not jump to
  // tomorrow's the instant today's ends.
  const [held, setHeld] = React.useState<Occurrence | null>(null);
  React.useEffect(() => {
    if (!schedule) return;
    if (held && now < held.endsAt + 60_000) return;
    setHeld(currentOrNextOccurrence(schedule, now));
  }, [schedule, now, held]);

  const occurrence = held;
  const phase = occurrence ? livePhase(occurrence, now) : 'upcoming';
  const duration = occurrence ? (occurrence.endsAt - occurrence.startsAt) / 1000 : 0;
  const elapsed = occurrence
    ? Math.min(duration, Math.max(0, (now - occurrence.startsAt) / 1000))
    : 0;

  return { now, occurrence, phase, elapsed };
}
