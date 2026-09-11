import { dateKeyInZone } from '@/lib/circles/tz';
import type { SessionRecord } from '@/types';

/**
 * Which of the reader's own sittings still need telling to their circles.
 *
 * Sittings are recorded locally first (`useSessionRecorder`), including the
 * ones flushed when the app is backgrounded or killed. Posting to the circle
 * happens separately, on the next chance the app gets, so a sit that ended
 * with the phone locked still reaches the circle later.
 *
 * The limits match `record_checkin` on the server: nothing before the day you
 * joined, and nothing older than 36 hours — enough to cover a sit last night
 * posted this morning, not enough to back-fill a week.
 */

export const CHECKIN_MAX_AGE_MS = 36 * 60 * 60 * 1000;

/** A little room for a device clock that runs fast. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface MyCircleRef {
  id: string;
  tz: string;
  /** Epoch ms. */
  joinedAt: number;
}

export interface PendingCheckin {
  circleId: string;
  /** Circle-local date the sit counts for. */
  localDate: string;
  /** The earliest sit that day, epoch ms — sent as `sat_at`. */
  satAt: number;
  /** True if any of that day's sits was the circle's live session. */
  live: boolean;
  /** Stamps to store once the server accepts it, one per sitting covered. */
  ackKeys: string[];
}

export function checkinAckKey(circleId: string, sessionId: string): string {
  return `${circleId}:${sessionId}`;
}

/**
 * One pending check-in per circle per circle-local day. The server keeps one
 * row per member per day anyway, so several sits on the same day travel as a
 * single request.
 */
export function pendingCheckins({
  sessions,
  circles,
  acked,
  now,
  minSeconds,
}: {
  sessions: SessionRecord[];
  circles: MyCircleRef[];
  acked: string[];
  now: number;
  minSeconds: number;
}): PendingCheckin[] {
  const done = new Set(acked);
  const pending = new Map<string, PendingCheckin>();

  for (const circle of circles) {
    const joinedDay = dateKeyInZone(circle.joinedAt, circle.tz);

    for (const session of sessions) {
      if (session.seconds < minSeconds) continue;

      const ackKey = checkinAckKey(circle.id, session.id);
      if (done.has(ackKey)) continue;

      const satAt = session.startedAt;
      if (now - satAt > CHECKIN_MAX_AGE_MS) continue;
      if (satAt > now + FUTURE_TOLERANCE_MS) continue;

      const localDate = dateKeyInZone(satAt, circle.tz);
      if (localDate < joinedDay) continue;

      const live = session.circleId === circle.id;
      const key = `${circle.id}|${localDate}`;
      const existing = pending.get(key);

      if (existing) {
        existing.satAt = Math.min(existing.satAt, satAt);
        existing.live = existing.live || live;
        existing.ackKeys.push(ackKey);
      } else {
        pending.set(key, { circleId: circle.id, localDate, satAt, live, ackKeys: [ackKey] });
      }
    }
  }

  return [...pending.values()].sort(
    (a, b) => a.localDate.localeCompare(b.localDate) || a.circleId.localeCompare(b.circleId),
  );
}
