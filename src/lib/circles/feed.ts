import type { MemberRole } from '@/lib/circles/types';

/**
 * The circle's feed, assembled on the client from what the server already
 * holds: who joined, who sat, and who answered the day's prompt.
 *
 * Deliberately thin. A sit says that someone sat — never for how long, never
 * what they listened to — so there is nothing in it to compare, and nobody is
 * ever listed for *not* sitting.
 */

export interface RosterEntry {
  userId: string;
  displayName: string | null;
  role: MemberRole;
  /** ISO timestamp. */
  joinedAt: string;
}

export interface CheckinRow {
  userId: string;
  localDate: string;
  live: boolean;
  createdAt: string;
}

export interface ResponseRow {
  userId: string;
  localDate: string;
  promptId: string;
  body: string;
  updatedAt: string;
  /**
   * Hidden after reports. Only ever true on the reader's own answer: the
   * server does not return anyone else's hidden answers at all.
   */
  hidden?: boolean;
}

interface FeedBase {
  key: string;
  /** Epoch ms, for ordering and "2h ago". */
  at: number;
  userId: string;
  name: string;
  isSelf: boolean;
}

export type FeedItem =
  | (FeedBase & { kind: 'joined' })
  | (FeedBase & { kind: 'sat'; live: boolean; localDate: string })
  | (FeedBase & { kind: 'answered'; body: string; localDate: string });

/**
 * Names as the feed shows them. Someone who never chose a name is "A member";
 * someone who has since left is "A former member", so their past sits and
 * answers still read sensibly without a name that is no longer in the circle.
 */
function nameFor(userId: string, roster: Map<string, RosterEntry>, selfId?: string): string {
  if (userId === selfId) return 'You';
  const entry = roster.get(userId);
  if (!entry) return 'A former member';
  return entry.displayName?.trim() || 'A member';
}

export function buildFeed({
  roster,
  checkins,
  responses,
  mutedIds = [],
  selfId,
  since,
}: {
  roster: RosterEntry[];
  checkins: CheckinRow[];
  responses: ResponseRow[];
  /** Readers whose answers this reader has chosen not to see. */
  mutedIds?: string[];
  selfId?: string;
  /** Epoch ms; anything older is left out. */
  since: number;
}): FeedItem[] {
  const byId = new Map(roster.map((entry) => [entry.userId, entry]));
  const muted = new Set(mutedIds);
  const items: FeedItem[] = [];

  const base = (userId: string, at: number, key: string): FeedBase => ({
    key,
    at,
    userId,
    name: nameFor(userId, byId, selfId),
    isSelf: userId === selfId,
  });

  for (const entry of roster) {
    const at = Date.parse(entry.joinedAt);
    items.push({ ...base(entry.userId, at, `joined:${entry.userId}`), kind: 'joined' });
  }

  for (const row of checkins) {
    const at = Date.parse(row.createdAt);
    items.push({
      ...base(row.userId, at, `sat:${row.userId}:${row.localDate}`),
      kind: 'sat',
      live: row.live,
      localDate: row.localDate,
    });
  }

  for (const row of responses) {
    if (muted.has(row.userId) && row.userId !== selfId) continue;
    const at = Date.parse(row.updatedAt);
    items.push({
      ...base(row.userId, at, `answered:${row.userId}:${row.localDate}`),
      kind: 'answered',
      body: row.body,
      localDate: row.localDate,
    });
  }

  return items
    .filter((item) => Number.isFinite(item.at) && item.at >= since)
    .sort((a, b) => b.at - a.at || a.key.localeCompare(b.key));
}
