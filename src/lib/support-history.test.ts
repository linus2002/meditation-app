import { describe, expect, it } from 'vitest';

import { addListen, MAX_HISTORY, type SupportListen } from '@/lib/support-history';

const listen = (sessionId: string, startedAt: number, seconds = 300): SupportListen => ({
  sessionId,
  startedAt,
  seconds,
});

describe('addListen', () => {
  it('keeps the newest first', () => {
    const history = addListen(addListen([], listen('scan-day', 1)), listen('five-minutes', 2));
    expect(history.map((entry) => entry.sessionId)).toEqual(['five-minutes', 'scan-day']);
  });

  it('ignores a tap-and-leave', () => {
    expect(addListen([], listen('scan-day', 1, 10))).toEqual([]);
  });

  it('updates the same listen rather than counting it twice', () => {
    const first = addListen([], listen('chemo-chair', 5, 1800));
    const extended = addListen(first, listen('chemo-chair', 5, 2400));
    expect(extended).toEqual([listen('chemo-chair', 5, 2400)]);
  });

  it('keeps a bounded history', () => {
    let history: SupportListen[] = [];
    for (let index = 0; index < MAX_HISTORY + 10; index += 1) {
      history = addListen(history, listen('two-minutes', index, 120));
    }
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].startedAt).toBe(MAX_HISTORY + 9);
  });
});
