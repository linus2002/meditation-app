'use client';

import * as React from 'react';

import { MIN_RECORDED_SECONDS } from '@/data/stats';
import { CirclesError, recordCheckin } from '@/lib/circles/api';
import { pendingCheckins } from '@/lib/circles/checkins';
import { upcomingOccurrences } from '@/lib/circles/schedule';
import { startCircleReminders } from '@/lib/notifications';
import { useApp } from '@/providers/app-provider';
import { useCircles } from '@/providers/circles-provider';

/** Refusals that will never succeed on a retry, so the sit is marked done. */
const FINAL: string[] = ['checkin_out_of_range', 'checkin_before_joining', 'not_a_member'];

/**
 * The single mount that keeps a reader's circles in step with what they do.
 *
 * Renders nothing. Sits in the root layout beside `ReminderScheduler`, and:
 *
 * - tells each circle about the reader's sits, whenever there are new ones and
 *   whenever the app comes back online — so a sit that ended with the phone
 *   locked still reaches the circle later;
 * - keeps the ten-minutes-before reminders scheduled for their circles.
 */
export function CircleSync() {
  const { sessions, hydrated } = useApp();
  const { memberships, acked, shareSits, reminders, userId, status, acknowledge } = useCircles();

  const [wake, setWake] = React.useState(0);
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    const bump = () => {
      if (document.visibilityState === 'visible') setWake((value) => value + 1);
    };
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('online', bump);
    return () => {
      document.removeEventListener('visibilitychange', bump);
      window.removeEventListener('online', bump);
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated || !userId || !shareSits || status === 'unconfigured') return;
    if (inFlight.current || memberships.length === 0) return;

    const pending = pendingCheckins({
      sessions,
      circles: memberships.map((entry) => ({
        id: entry.circle.id,
        tz: entry.circle.tz,
        joinedAt: entry.joinedAt,
      })),
      acked,
      now: Date.now(),
      minSeconds: MIN_RECORDED_SECONDS,
    });
    if (pending.length === 0) return;

    inFlight.current = true;
    void (async () => {
      const done: string[] = [];
      for (const entry of pending) {
        try {
          await recordCheckin(entry.circleId, entry.satAt, entry.live);
          done.push(...entry.ackKeys);
        } catch (error) {
          if (error instanceof CirclesError && FINAL.includes(error.code)) {
            done.push(...entry.ackKeys);
          } else {
            // Offline or a passing failure: leave it for the next wake.
            break;
          }
        }
      }
      inFlight.current = false;
      if (done.length > 0) acknowledge(done);
    })();
  }, [hydrated, userId, shareSits, status, memberships, sessions, acked, acknowledge, wake]);

  React.useEffect(() => {
    const circles = reminders ? memberships.map((entry) => entry.circle) : [];
    return startCircleReminders(() =>
      circles.flatMap((circle) =>
        upcomingOccurrences(circle, Date.now(), 7).map((occurrence) => ({
          circleId: circle.id,
          circleName: circle.name,
          occurrence,
        })),
      ),
    );
  }, [reminders, memberships]);

  return null;
}
