import { describe, expect, it } from 'vitest';

import { nextRovingIndex } from '@/lib/roving';

describe('nextRovingIndex', () => {
  it('moves right and left, wrapping at both ends', () => {
    expect(nextRovingIndex('ArrowRight', 0, 5)).toBe(1);
    expect(nextRovingIndex('ArrowRight', 4, 5)).toBe(0);
    expect(nextRovingIndex('ArrowLeft', 0, 5)).toBe(4);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextRovingIndex('Home', 3, 5)).toBe(0);
    expect(nextRovingIndex('End', 1, 5)).toBe(4);
  });

  it('uses Up and Down in radio groups but not tab bars', () => {
    expect(nextRovingIndex('ArrowDown', 1, 5)).toBe(2);
    expect(nextRovingIndex('ArrowUp', 1, 5)).toBe(0);
    expect(nextRovingIndex('ArrowDown', 1, 5, { vertical: false })).toBeNull();
  });

  it('ignores every other key, and empty groups', () => {
    expect(nextRovingIndex('Enter', 1, 5)).toBeNull();
    expect(nextRovingIndex('a', 1, 5)).toBeNull();
    expect(nextRovingIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
