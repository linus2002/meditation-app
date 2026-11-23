import { describe, expect, it } from 'vitest';

import { depthOf, withDepth } from '@/lib/history-depth';

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
