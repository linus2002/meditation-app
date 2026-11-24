import { describe, expect, it } from 'vitest';

import { parseLimit, quotaSubjects } from '../../supabase/functions/_shared/kapwa-limits';

describe('parseLimit', () => {
  it('reads a positive whole number', () => {
    expect(parseLimit('45', 30)).toBe(45);
  });

  it.each([undefined, '', 'abc', '0', '-5', '2.5', 'Infinity'])('falls back for %j instead of having no limit', (raw) => {
    expect(parseLimit(raw, 30)).toBe(30);
  });
});

describe('quotaSubjects', () => {
  it('counts a signed-in account by its id, and everyone together', () => {
    expect(quotaSubjects({ userId: 'u1', anonymous: false, ipHash: 'h' })).toEqual(['user:u1', 'global']);
  });

  it('counts an anonymous account by address: a new one each time must not mean a new quota', () => {
    expect(quotaSubjects({ userId: 'anon-7', anonymous: true, ipHash: 'h' })).toEqual(['ip:h', 'global']);
  });

  it('counts someone with no account by address', () => {
    expect(quotaSubjects({ userId: null, anonymous: false, ipHash: 'h' })).toEqual(['ip:h', 'global']);
  });
});
