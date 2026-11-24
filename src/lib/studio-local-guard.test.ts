import { describe, expect, it } from 'vitest';

import { fromThisStudio } from '../../studio/localGuard';

const from = (headers: Record<string, string>) => fromThisStudio({ headers } as never);

describe('the local Studio answers only its own page', () => {
  it('answers the Studio tab', () => {
    expect(from({ host: 'localhost:3333', 'sec-fetch-site': 'same-origin', origin: 'http://localhost:3333' })).toBe(true);
    expect(from({ host: '127.0.0.1:3333', 'sec-fetch-site': 'same-origin' })).toBe(true);
  });

  it('refuses another website, even one on another localhost port', () => {
    expect(from({ host: 'localhost:3333', 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' })).toBe(false);
    expect(from({ host: 'localhost:3333', 'sec-fetch-site': 'same-site', origin: 'http://localhost:3000' })).toBe(false);
  });

  it('refuses an outside name pointed at this machine', () => {
    expect(from({ host: 'evil.example:3333', 'sec-fetch-site': 'same-origin', origin: 'http://evil.example:3333' })).toBe(false);
  });

  it('checks the origin when the browser sends no fetch metadata', () => {
    expect(from({ host: '127.0.0.1:3333', origin: 'https://evil.example' })).toBe(false);
    expect(from({ host: '127.0.0.1:3333', origin: 'http://127.0.0.1:3333' })).toBe(true);
  });

  it('lets a program on this machine through', () => {
    expect(from({ host: '127.0.0.1:3333' })).toBe(true);
  });
});
