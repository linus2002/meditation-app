import { describe, expect, it } from 'vitest';

import { FORWARD_LOOP_MS, allowForward, exportedPageExists } from '@/lib/entry-forward';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('exportedPageExists', () => {
  it('asks for the route data file, with or without a trailing slash', async () => {
    const asked: string[] = [];
    const fetcher = async (url: string) => {
      asked.push(url);
      return { ok: true };
    };
    await exportedPageExists('/player/open-heart', fetcher);
    await exportedPageExists('/player/open-heart/', fetcher);
    expect(asked).toEqual(['/player/open-heart/index.txt', '/player/open-heart/index.txt']);
  });

  it('counts a missing file or a failed fetch as no page', async () => {
    expect(await exportedPageExists('/player/gone', async () => ({ ok: false }))).toBe(false);
    expect(
      await exportedPageExists('/player/gone', async () => {
        throw new TypeError('Failed to fetch');
      }),
    ).toBe(false);
  });
});

describe('allowForward', () => {
  it('lets a forward through once, and stops the same one straight after', () => {
    const storage = memoryStorage();
    expect(allowForward('/player/x', 1_000, storage)).toBe(true);
    expect(allowForward('/player/x', 2_000, storage)).toBe(false);
  });

  it('allows a different page, or the same one later', () => {
    const storage = memoryStorage();
    expect(allowForward('/player/x', 1_000, storage)).toBe(true);
    expect(allowForward('/sleep', 2_000, storage)).toBe(true);
    expect(allowForward('/sleep', 2_000 + FORWARD_LOOP_MS, storage)).toBe(true);
  });

  it('goes ahead without storage', () => {
    expect(allowForward('/player/x', 1_000, null)).toBe(true);
  });
});
