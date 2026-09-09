import { describe, expect, it } from 'vitest';

import { stories } from '@/data/stories';
import {
  estimatedMinutes,
  estimatedSeconds,
  segmentAfterSeconds,
  segmentStory,
  storyWordCount,
  totalLength,
} from '@/lib/story';
import type { Story } from '@/types';

const story = (paragraphs: string[]): Story => ({
  id: 'test',
  title: 'Test',
  description: '',
  category: 'sleep',
  voice: 'Mara',
  image: {} as Story['image'],
  imageAlt: '',
  paragraphs,
  soundscape: 'rain',
});

describe('segmentStory', () => {
  it('splits a paragraph into sentences', () => {
    const segments = segmentStory(story(['The lamp was lit. The sea was flat.']));
    expect(segments.map((s) => s.text)).toEqual(['The lamp was lit.', 'The sea was flat.']);
  });

  /* The voice has to hear the sentence ending, so punctuation stays attached. */
  it('keeps the terminating punctuation', () => {
    const segments = segmentStory(story(['Who is there? Nobody! Fine.']));
    expect(segments.map((s) => s.text)).toEqual(['Who is there?', 'Nobody!', 'Fine.']);
  });

  it('tracks which paragraph each sentence came from', () => {
    const segments = segmentStory(story(['One. Two.', 'Three.']));
    expect(segments.map((s) => s.paragraph)).toEqual([0, 0, 1]);
  });

  it('numbers segments continuously across paragraphs', () => {
    const segments = segmentStory(story(['One. Two.', 'Three.']));
    expect(segments.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('gives each segment the offset of the text before it', () => {
    const segments = segmentStory(story(['Ab. Cd.']));
    expect(segments[0].offset).toBe(0);
    expect(segments[1].offset).toBe(segments[0].text.length);
  });

  it('drops empty paragraphs instead of emitting blank segments', () => {
    const segments = segmentStory(story(['', '   ', 'Real text.']));
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Real text.');
  });

  it('handles a story with no paragraphs at all', () => {
    expect(segmentStory(story([]))).toEqual([]);
  });

  it('keeps a sentence with no closing punctuation', () => {
    const segments = segmentStory(story(['No full stop here']));
    expect(segments.map((s) => s.text)).toEqual(['No full stop here']);
  });

  it('does not split on a decimal point mid-number', () => {
    const segments = segmentStory(story(['It was 3.5 miles out.']));
    expect(segments).toHaveLength(1);
  });
});

describe('storyWordCount and estimates', () => {
  it('counts words, not whitespace', () => {
    expect(storyWordCount(story(['one two  three', 'four']))).toBe(4);
  });

  it('is zero for an empty story', () => {
    expect(storyWordCount(story([]))).toBe(0);
  });

  /* A "0 Min." story would read as broken, so the floor is one minute. */
  it('never estimates less than a minute', () => {
    expect(estimatedMinutes(story(['One word.']))).toBe(1);
  });

  it('scales with the reading rate', () => {
    const long = story([Array(1400).fill('word').join(' ')]);
    expect(estimatedSeconds(long, 2)).toBeLessThan(estimatedSeconds(long, 1));
  });
});

describe('totalLength', () => {
  it('reaches the end of the final segment', () => {
    const segments = segmentStory(story(['Ab. Cd.']));
    const last = segments[segments.length - 1];
    expect(totalLength(segments)).toBe(last.offset + last.text.length);
  });

  /* It is a progress denominator, so it must never be 0. */
  it('is 1, not 0, when there is nothing to read', () => {
    expect(totalLength([])).toBe(1);
  });
});

describe('segmentAfterSeconds', () => {
  const long = segmentStory(story([Array(60).fill('A sentence of some length here.').join(' ')]));

  it('moves forward through the text', () => {
    expect(segmentAfterSeconds(long, 0, 30)).toBeGreaterThan(0);
  });

  it('moves backward and clamps at the start', () => {
    expect(segmentAfterSeconds(long, 2, -600)).toBe(0);
  });

  it('clamps at the last segment rather than running off the end', () => {
    expect(segmentAfterSeconds(long, 0, 100000)).toBe(long.length - 1);
  });

  it('skips further at a slower rate for the same seconds', () => {
    const fast = segmentAfterSeconds(long, 0, 30, 2);
    const slow = segmentAfterSeconds(long, 0, 30, 1);
    expect(fast).toBeGreaterThanOrEqual(slow);
  });
});

describe('the shipped stories', () => {
  it.each(stories.map((item) => [item.id, item] as const))('%s segments cleanly', (_id, item) => {
    const segments = segmentStory(item);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((segment) => segment.text.trim().length > 0)).toBe(true);
    expect(segments.map((segment) => segment.index)).toEqual(segments.map((_, i) => i));
  });

  it.each(stories.map((item) => [item.id, item] as const))('%s reports a duration', (_id, item) => {
    expect(estimatedMinutes(item)).toBeGreaterThan(0);
  });
});
