import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { elapsedAt, poseTitle, totalSeconds, type YogaPose } from '@/lib/yoga';

const poses: YogaPose[] = [
  { name: 'Seated breath', seconds: 60, cue: '…' },
  { name: 'Low lunge', seconds: 45, cue: '…', side: 'left' },
  { name: 'Low lunge', seconds: 45, cue: '…', side: 'right' },
];

describe('totalSeconds', () => {
  it('is the sum of the poses', () => {
    expect(totalSeconds(poses)).toBe(150);
    expect(totalSeconds([])).toBe(0);
  });
});

describe('elapsedAt', () => {
  it('starts at zero', () => {
    expect(elapsedAt(poses, 0, 60)).toBe(0);
  });

  it('counts finished poses plus progress in the current one', () => {
    expect(elapsedAt(poses, 1, 30)).toBe(75);
  });

  it('reaches the full length at the end', () => {
    expect(elapsedAt(poses, 2, 0)).toBe(150);
  });

  it('never runs past the session or before it', () => {
    expect(elapsedAt(poses, 9, -5)).toBe(150);
    expect(elapsedAt(poses, -1, 999)).toBe(0);
    expect(elapsedAt([], 0, 0)).toBe(0);
  });
});

describe('poseTitle', () => {
  it('names the side when there is one', () => {
    expect(poseTitle(poses[1])).toBe('Low lunge · Left side');
    expect(poseTitle(poses[0])).toBe('Seated breath');
  });
});

describe('the yoga library', () => {
  // Read as text: the data file imports photographs, which tests cannot load.
  const source = readFileSync(fileURLToPath(new URL('../data/yoga.ts', import.meta.url)), 'utf8');

  it('gives every session a unique id the precache script can find', () => {
    const ids = [...source.matchAll(/^\s{4}id: '([^']+)',\r?$/gm)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses real soundscapes', () => {
    const scapes = [...source.matchAll(/soundscape: '([a-z]+)'/g)].map((match) => match[1]);
    const known = ['rain', 'ocean', 'forest', 'night', 'bowl', 'pad', 'drone', 'chimes'];
    for (const scape of scapes) expect(known).toContain(scape);
  });
});
