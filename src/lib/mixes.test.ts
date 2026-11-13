import { describe, expect, it } from 'vitest';

import {
  addItem,
  cleanName,
  createMix,
  MAX_MIX_ITEMS,
  moveItem,
  nextPosition,
  parseMixes,
  playOrder,
  previousPosition,
  removeItem,
  type MixItem,
} from './mixes';

const a: MixItem = { kind: 'meditation', id: 'body-scan' };
const b: MixItem = { kind: 'story', id: 'lighthouse' };
const c: MixItem = { kind: 'meditation', id: 'open-heart' };

describe('editing a mix', () => {
  const mix = createMix('  Night   wind down ', 1, 'm1', [a, b, c]);

  it('tidies the name and falls back when empty', () => {
    expect(mix.name).toBe('Night wind down');
    expect(cleanName('   ')).toBe('My mix');
  });

  it('adds each session once, and stops at the size limit', () => {
    expect(addItem(mix, a, 2)).toBe(mix);
    const full = createMix('Full', 1, 'm2', Array.from({ length: MAX_MIX_ITEMS }, (_, i) => ({ kind: 'meditation' as const, id: `s${i}` })));
    expect(addItem(full, b, 2)).toBe(full);
    expect(addItem(createMix('x', 1, 'm3'), b, 2).items).toEqual([b]);
  });

  it('a meditation and a story may share an id without clashing', () => {
    const same: MixItem = { kind: 'story', id: 'body-scan' };
    expect(addItem(mix, same, 2).items).toHaveLength(4);
  });

  it('removes and reorders, ignoring moves off either end', () => {
    expect(removeItem(mix, 1, 2).items).toEqual([a, c]);
    expect(moveItem(mix, 2, -1, 2).items).toEqual([a, c, b]);
    expect(moveItem(mix, 0, -1, 2)).toBe(mix);
    expect(moveItem(mix, 2, 1, 2)).toBe(mix);
  });
});

describe('playing a mix', () => {
  it('plays in order unless shuffled', () => {
    expect(playOrder(4, false)).toEqual([0, 1, 2, 3]);
  });

  it('a shuffle plays every item exactly once', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const order = playOrder(10, true, random);
    expect([...order].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(order).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('ends after the last item, or goes round when looping', () => {
    expect(nextPosition(0, 3, false)).toBe(1);
    expect(nextPosition(2, 3, false)).toBeNull();
    expect(nextPosition(2, 3, true)).toBe(0);
    expect(nextPosition(0, 0, true)).toBeNull();
  });

  it('steps back, wrapping only when looping', () => {
    expect(previousPosition(2, 3, false)).toBe(1);
    expect(previousPosition(0, 3, false)).toBe(0);
    expect(previousPosition(0, 3, true)).toBe(2);
  });
});

describe('parseMixes', () => {
  it('keeps valid mixes and drops anything malformed', () => {
    const raw = JSON.stringify([
      { id: 'm1', name: 'Good', items: [a, { kind: 'video', id: 'x' }, { kind: 'story' }], createdAt: 1, updatedAt: 2 },
      { name: 'No id', items: [] },
      'nonsense',
    ]);
    expect(parseMixes(raw)).toEqual([{ id: 'm1', name: 'Good', items: [a], createdAt: 1, updatedAt: 2 }]);
  });

  it('survives empty or broken storage', () => {
    expect(parseMixes(null)).toEqual([]);
    expect(parseMixes('{not json')).toEqual([]);
    expect(parseMixes('{"a":1}')).toEqual([]);
  });
});
