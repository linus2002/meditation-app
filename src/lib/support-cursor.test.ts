import { describe, expect, it } from 'vitest';

import { newestTime } from '@/lib/support';

describe('newestTime', () => {
  it('takes the newest time the server sent', () => {
    expect(newestTime(null, [{ created_at: '2026-11-23T10:00:00.100Z' }, { created_at: '2026-11-23T10:00:02.000Z' }])).toBe(
      '2026-11-23T10:00:02.000Z',
    );
  });

  it('never moves back', () => {
    expect(newestTime('2026-11-23T10:00:05.000Z', [{ created_at: '2026-11-23T10:00:01.000Z' }])).toBe(
      '2026-11-23T10:00:05.000Z',
    );
  });

  it('compares times, not text, across formats', () => {
    expect(newestTime('2026-11-23T10:00:05Z', [{ created_at: '2026-11-23 18:00:06+08' }])).toBe('2026-11-23 18:00:06+08');
  });
});
