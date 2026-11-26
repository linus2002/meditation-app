import { afterEach, describe, expect, it, vi } from 'vitest';

import { adoptEarlierScreen, depthOf, withDepth } from '@/lib/history-depth';

describe('history depth', () => {
  it('starts at zero for a screen opened cold', () => {
    expect(depthOf(null)).toBe(0);
    expect(depthOf({ __NA: true })).toBe(0);
  });

  it('goes one deeper on a push, and stays put on a replace', () => {
    const home = withDepth({ __NA: true }, 'replace', null);
    expect(depthOf(home)).toBe(0);
    const sleep = withDepth({ __NA: true }, 'replace', home);
    expect(depthOf(sleep)).toBe(0);
    const story = withDepth({ __NA: true }, 'push', sleep);
    expect(depthOf(story)).toBe(1);
    expect(depthOf(withDepth({}, 'push', story))).toBe(2);
  });

  it('keeps everything Next.js put in the state', () => {
    const state = withDepth({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [1] }, 'push', null);
    expect(state).toMatchObject({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [1] });
  });

  it('copes with state that is not an object', () => {
    expect(depthOf(withDepth(null, 'push', null))).toBe(1);
    expect(depthOf(withDepth('x', 'push', null))).toBe(1);
  });
});

describe('a page loaded afresh from another screen', () => {
  afterEach(() => vi.unstubAllGlobals());

  function load({ referrer, type = 'navigate', length = 3 }: { referrer: string; type?: string; length?: number }) {
    const history = {
      length,
      state: { __NA: true } as unknown,
      replaceState(data: unknown) {
        history.state = data;
      },
    };
    vi.stubGlobal('window', { history, location: { origin: 'https://serenity.app' } });
    vi.stubGlobal('document', { referrer });
    vi.stubGlobal('performance', { getEntriesByType: () => [{ type }] });
    return history;
  }

  it('counts the screen its link was on, so Back returns there', () => {
    const history = load({ referrer: 'https://serenity.app/meditations' });
    expect(adoptEarlierScreen()).toBe(true);
    expect(depthOf(history.state)).toBe(1);
    expect((history.state as Record<string, unknown>).__NA).toBe(true);
  });

  it('leaves alone a page opened from elsewhere, reloaded, or with nothing behind it', () => {
    for (const opts of [
      { referrer: 'https://search.example/' },
      { referrer: '' },
      { referrer: 'https://serenity.app/home', type: 'reload' },
      { referrer: 'https://serenity.app/home', length: 1 },
    ]) {
      const history = load(opts);
      expect(adoptEarlierScreen()).toBe(false);
      expect(depthOf(history.state)).toBe(0);
    }
  });
});
