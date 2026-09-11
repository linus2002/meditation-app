'use client';

import * as React from 'react';

import * as api from '@/lib/circles/api';
import { CirclesError, type CircleToday, type CirclesErrorCode } from '@/lib/circles/api';
import type { CheckinRow, ResponseRow, RosterEntry } from '@/lib/circles/feed';
import { addDaysToKey, dateKeyInZone } from '@/lib/circles/tz';
import type { Circle } from '@/lib/circles/types';
import { useCircles } from '@/providers/circles-provider';

/** The feed shows a week; the streak looks back further. */
const FEED_DAYS = 7;
const STREAK_DAYS = 90;

export interface CircleInside {
  roster: RosterEntry[];
  checkins: CheckinRow[];
  responses: ResponseRow[];
  /** Circle-local dates that counted for the group streak. */
  days: string[];
  today: CircleToday;
}

export interface CircleState {
  circle: Circle | null;
  /** Only for members; null for someone looking before they join. */
  inside: CircleInside | null;
  loading: boolean;
  error: CirclesErrorCode | 'missing' | null;
  reload: () => Promise<void>;
}

/**
 * One circle, as its page shows it. Members get the roster, the week's sits
 * and answers, the counted days and today's prompt; anyone else gets only the
 * circle itself, to decide whether to join.
 *
 * Fetched on open, after the reader's own writes, and on returning to the app.
 * There are no live subscriptions outside the session room: a feed that
 * updates on its own while you read it is exactly the pull this avoids.
 */
export function useCircle(id: string | null): CircleState {
  const { isMember, status } = useCircles();
  const member = id ? isMember(id) : false;

  const [circle, setCircle] = React.useState<Circle | null>(null);
  const [inside, setInside] = React.useState<CircleInside | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<CircleState['error']>(null);

  const load = React.useCallback(async () => {
    if (!id || status === 'unconfigured') {
      setLoading(false);
      return;
    }

    try {
      const found = await api.getCircle(id);
      if (!found) {
        setCircle(null);
        setError('missing');
        return;
      }
      setCircle(found);

      if (!member) {
        setInside(null);
        setError(null);
        return;
      }

      const todayKey = dateKeyInZone(Date.now(), found.tz);
      const feedSince = addDaysToKey(todayKey, -(FEED_DAYS - 1));

      const [roster, checkins, responses, days, today] = await Promise.all([
        api.getRoster(id),
        api.getCheckins(id, feedSince),
        api.getResponses(id, feedSince),
        api.getCircleDays(id, addDaysToKey(todayKey, -(STREAK_DAYS - 1))),
        api.getCircleToday(id),
      ]);

      setInside({ roster, checkins, responses, days, today });
      setError(null);
    } catch (caught) {
      setError(caught instanceof CirclesError ? caught.code : 'unknown');
    } finally {
      setLoading(false);
    }
  }, [id, member, status]);

  React.useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return { circle, inside, loading, error, reload: load };
}
