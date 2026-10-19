import { describe, expect, it } from 'vitest';

import { RESUME_TTL_MS, resumePoint } from '@/lib/resume';

const NOW = 1_800_000_000_000;

describe('resumePoint', () => {
  it('picks up where the session was left', () => {
    expect(resumePoint({ seconds: 372.6, savedAt: NOW - 1000 }, 1800, NOW)).toBe(372);
  });

  it('starts fresh when nothing was saved', () => {
    expect(resumePoint(undefined, 1800, NOW)).toBeNull();
  });

  it('ignores a session that had barely started', () => {
    expect(resumePoint({ seconds: 12, savedAt: NOW }, 1800, NOW)).toBeNull();
  });

  it('ignores a session that was all but finished', () => {
    expect(resumePoint({ seconds: 1790, savedAt: NOW }, 1800, NOW)).toBeNull();
  });

  it('forgets a place kept for more than a week', () => {
    expect(resumePoint({ seconds: 600, savedAt: NOW - RESUME_TTL_MS - 1 }, 1800, NOW)).toBeNull();
  });
});
