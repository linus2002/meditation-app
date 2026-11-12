import { describe, expect, it } from 'vitest';

import { isMemberRoute } from './account-gate';

describe('isMemberRoute', () => {
  it('locks screens that start a practice or hold personal entries', () => {
    for (const path of [
      '/player/open-heart',
      '/timer',
      '/yoga/sun-salutation',
      '/activities',
      '/stories/lighthouse',
      '/support/two-minutes',
      '/reflections',
      '/assessment',
      '/kapwa',
    ]) {
      expect(isMemberRoute(path), path).toBe(true);
    }
  });

  it('leaves browsing screens open to guests', () => {
    for (const path of ['/', '/home', '/meditations', '/yoga', '/stories', '/support', '/sleep', '/discover', '/programs/calm', '/search', '/profile', '/login', '/welcome']) {
      expect(isMemberRoute(path), path).toBe(false);
    }
  });

  it('reads the mobile build’s trailing slashes the same way', () => {
    expect(isMemberRoute('/timer/')).toBe(true);
    expect(isMemberRoute('/player/open-heart/')).toBe(true);
    expect(isMemberRoute('/yoga/')).toBe(false);
    expect(isMemberRoute('/home/')).toBe(false);
  });

  it('does not match a route that only shares a prefix', () => {
    expect(isMemberRoute('/timers')).toBe(false);
    expect(isMemberRoute('/kapwa-info')).toBe(false);
  });
});
