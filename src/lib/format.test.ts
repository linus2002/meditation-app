import { describe, expect, it } from 'vitest';

import { formatMinutesSeconds, formatSpokenTime } from '@/lib/format';

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

describe('formatMinutesSeconds', () => {
  it('pads the seconds', () => {
    expect(formatMinutesSeconds(65)).toBe('1:05');
    expect(formatMinutesSeconds(-4)).toBe('0:00');
  });
});
