import { describe, expect, it } from 'vitest';

import { formatSpokenTime } from '@/lib/format';

describe('formatSpokenTime', () => {
  it('says minutes and seconds in words', () => {
    expect(formatSpokenTime(312)).toBe('5 minutes 12 seconds');
    expect(formatSpokenTime(61)).toBe('1 minute 1 second');
  });

  it('drops the part that is zero', () => {
    expect(formatSpokenTime(1800)).toBe('30 minutes');
    expect(formatSpokenTime(0)).toBe('0 seconds');
  });
});
