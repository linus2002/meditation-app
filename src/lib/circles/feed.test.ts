import { describe, expect, it } from 'vitest';

import { buildFeed, type RosterEntry } from '@/lib/circles/feed';

const roster: RosterEntry[] = [
  { userId: 'me', displayName: 'Maya', role: 'member', joinedAt: '2026-01-10T09:00:00Z' },
  { userId: 'u2', displayName: null, role: 'member', joinedAt: '2026-01-14T08:00:00Z' },
  { userId: 'u3', displayName: '  Theo ', role: 'anchor', joinedAt: '2026-01-14T09:00:00Z' },
];

const since = Date.parse('2026-01-12T00:00:00Z');

function feed(mutedIds: string[] = []) {
  return buildFeed({
    roster,
    checkins: [
      { userId: 'u2', localDate: '2026-01-15', live: true, createdAt: '2026-01-15T07:16:00Z' },
      { userId: 'gone', localDate: '2026-01-14', live: false, createdAt: '2026-01-14T20:00:00Z' },
    ],
    responses: [
      {
        userId: 'u2',
        localDate: '2026-01-15',
        promptId: 'leave-behind',
        body: 'The rush.',
        updatedAt: '2026-01-15T07:20:00Z',
      },
    ],
    mutedIds,
    selfId: 'me',
    since,
  });
}

describe('buildFeed', () => {
  it('puts the newest first and leaves out anything older than the window', () => {
    expect(feed().map((item) => item.key)).toEqual([
      'answered:u2:2026-01-15',
      'sat:u2:2026-01-15',
      'sat:gone:2026-01-14',
      'joined:u3',
      'joined:u2',
    ]);
  });

  it('names people honestly', () => {
    const names = Object.fromEntries(feed().map((item) => [item.key, item.name]));
    expect(names['sat:u2:2026-01-15']).toBe('A member');
    expect(names['sat:gone:2026-01-14']).toBe('A former member');
    expect(names['joined:u3']).toBe('Theo');
  });

  it('says a sit happened, and whether it was live — nothing more', () => {
    const sat = feed().find((item) => item.kind === 'sat' && item.userId === 'u2');
    expect(sat).toMatchObject({ kind: 'sat', live: true });
    expect(Object.keys(sat ?? {})).not.toContain('seconds');
  });

  it('hides a muted member’s answers but not that they sat', () => {
    const keys = feed(['u2']).map((item) => item.key);
    expect(keys).not.toContain('answered:u2:2026-01-15');
    expect(keys).toContain('sat:u2:2026-01-15');
  });
});
