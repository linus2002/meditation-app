import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { elapsedAt, poseLines, poseTitle, totalSeconds, type YogaPose } from '@/lib/yoga';

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
  // The yoga library as pulled from Sanity, read as JSON.
  const { yoga } = JSON.parse(
    readFileSync(fileURLToPath(new URL('../content/content.json', import.meta.url)), 'utf8'),
  ) as { yoga: { id: string; soundscape: string }[] };

  it('gives every session a unique id', () => {
    const ids = yoga.map((session) => session.id);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses real soundscapes', () => {
    const scapes = yoga.map((session) => session.soundscape);
    const known = ['rain', 'ocean', 'forest', 'night', 'bowl', 'pad', 'drone', 'chimes'];
    for (const scape of scapes) expect(known).toContain(scape);
  });
});

describe('poseLines', () => {
  const lunge: YogaPose = { name: 'Low lunge', seconds: 45, cue: 'Step one foot forward.', side: 'left' };

  it('names the pose, with its side, the way the instructor says it', () => {
    expect(poseLines(lunge, false)).toEqual({
      name: 'Low lunge, left side.',
      cue: 'Step one foot forward.',
      next: 'Next, Low lunge, left side.',
    });
  });

  it('announces the last pose as the last', () => {
    expect(poseLines({ name: 'Rest', seconds: 60, cue: 'Lie back.' }, true).next).toBe(
      'And finally, Rest.',
    );
  });
});
