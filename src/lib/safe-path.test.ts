import { describe, expect, it } from 'vitest';

import { safePath } from '@/lib/safe-path';

const HOME = 'https://serenity.example';

describe('safePath', () => {
  it.each([
    '/\\evil.test',
    '/\\/evil.test',
    '//evil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    '/..//evil.test',
    '/.//evil.test',
    '/%2e%2e//evil.test',
    'https://evil.test',
    'javascript:alert(1)',
    ' /home',
    'home',
    '',
    null,
  ])('refuses %j', (value) => {
    expect(safePath(value, HOME)).toBeNull();
  });

  it.each(['/timer', '/player/open-heart', '/mixes?id=mix-1', '/player/open-heart/', '/help?t=1#latest'])(
    'allows %j',
    (value) => {
      expect(safePath(value, HOME)).toBe(value);
    },
  );
});
