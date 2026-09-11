'use client';

import * as React from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase/client';

export interface PresentMember {
  userId: string;
  name: string | null;
  /** Epoch ms they arrived. */
  since: number;
}

interface PresencePayload {
  name: string | null;
  since: number;
}

/**
 * "Who's here now", from Supabase Realtime Presence.
 *
 * The channel is private (`circle:<id>:live`), and the database only lets
 * members of that circle onto it. It is opened only while `active` — around
 * the session — so nobody holds a connection open all day.
 *
 * Watching and appearing are separate. Anyone on the circle page during the
 * session sees who is here; only someone who has tapped Join (`me` is set)
 * appears to others. Nobody is shown who is not actually connected, and
 * nobody is ever listed as absent.
 */
export function useCirclePresence({
  circleId,
  active,
  me,
}: {
  circleId: string;
  active: boolean;
  me: { userId: string; name: string | null } | null;
}): { present: PresentMember[]; connected: boolean } {
  const [present, setPresent] = React.useState<PresentMember[]>([]);
  const [connected, setConnected] = React.useState(false);

  const meKey = me?.userId ?? null;
  const meName = me?.name ?? null;

  React.useEffect(() => {
    const client = getSupabase();
    if (!client || !active) {
      setPresent([]);
      setConnected(false);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const joinedAt = Date.now();

    void (async () => {
      // Private channels are checked against the signed-in user's token.
      await client.realtime.setAuth();
      if (cancelled) return;

      channel = client.channel(`circle:${circleId}:live`, {
        config: { private: true, presence: { key: meKey ?? `watcher-${joinedAt}` } },
      });

      channel.on('presence', { event: 'sync' }, () => {
        if (!channel) return;
        const state = channel.presenceState<PresencePayload>();
        const people = Object.entries(state).flatMap(([userId, metas]) => {
          const first = metas[0];
          return first ? [{ userId, name: first.name ?? null, since: first.since ?? 0 }] : [];
        });
        setPresent(people.sort((a, b) => a.since - b.since));
      });

      channel.subscribe((subscription) => {
        if (subscription === 'SUBSCRIBED') {
          setConnected(true);
          if (meKey && channel) void channel.track({ name: meName, since: joinedAt });
        } else if (
          subscription === 'CHANNEL_ERROR' ||
          subscription === 'TIMED_OUT' ||
          subscription === 'CLOSED'
        ) {
          setConnected(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
      setConnected(false);
    };
  }, [circleId, active, meKey, meName]);

  return { present, connected };
}
