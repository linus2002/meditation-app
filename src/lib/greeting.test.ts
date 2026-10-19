import { describe, expect, it } from 'vitest';

import { longDateLabel, timeOfDayGreeting } from '@/lib/greeting';

describe('timeOfDayGreeting', () => {
  it('follows the day', () => {
    expect(timeOfDayGreeting(7)).toBe('Good morning');
    expect(timeOfDayGreeting(13)).toBe('Good afternoon');
    expect(timeOfDayGreeting(19)).toBe('Good evening');
  });

  it('keeps it plain in the small hours', () => {
    expect(timeOfDayGreeting(23)).toBe('Hello');
    expect(timeOfDayGreeting(3)).toBe('Hello');
  });
});

describe('longDateLabel', () => {
  it('names the weekday, day and month', () => {
    expect(longDateLabel(new Date(2026, 9, 17))).toBe('Saturday 17 October');
  });
});
