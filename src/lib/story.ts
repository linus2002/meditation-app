import type { Story } from '@/types';

export interface StorySegment {
  /** Index across the whole story. */
  index: number;
  /** Which paragraph this sentence belongs to. */
  paragraph: number;
  text: string;
  /** Characters before this segment, used to weight the progress bar. */
  offset: number;
}

/** Roughly how fast a narration voice reads, in words per minute. */
const WORDS_PER_MINUTE = 140;

/**
 * Splits a story into sentences.
 *
 * Narration is spoken one sentence at a time rather than as one long
 * utterance. That is what makes the rest of the player possible: it gives a
 * real position to seek to, a progress figure that means something, and a
 * sentence to highlight on screen. It also sidesteps the long-standing Chrome
 * bug where a single long utterance stops after about fifteen seconds.
 */
export function segmentStory(story: Story): StorySegment[] {
  const segments: StorySegment[] = [];
  let offset = 0;

  story.paragraphs.forEach((paragraph, paragraphIndex) => {
    // Split after ., ! or ? when followed by a space — keeping the punctuation,
    // so the voice still hears the sentence ending.
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const text of sentences) {
      segments.push({ index: segments.length, paragraph: paragraphIndex, text, offset });
      offset += text.length;
    }
  });

  return segments;
}

export function storyWordCount(story: Story): number {
  return story.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
}

/**
 * Estimated listening time. Real duration depends on the device voice and the
 * chosen rate, so this is shown as an approximation rather than a countdown.
 */
export function estimatedMinutes(story: Story, rate = 1): number {
  return Math.max(1, Math.round(storyWordCount(story) / (WORDS_PER_MINUTE * rate)));
}

export function estimatedSeconds(story: Story, rate = 1): number {
  return Math.round((storyWordCount(story) / (WORDS_PER_MINUTE * rate)) * 60);
}

/** Total characters, the denominator for progress. */
export function totalLength(segments: StorySegment[]): number {
  const last = segments[segments.length - 1];
  return last ? last.offset + last.text.length : 1;
}

/**
 * The segment roughly `seconds` away from the current one — how the skip
 * buttons turn a time offset into a position in the text.
 */
export function segmentAfterSeconds(
  segments: StorySegment[],
  from: number,
  seconds: number,
  rate = 1,
): number {
  const charsPerSecond = (WORDS_PER_MINUTE * rate * 5.5) / 60;
  const target = (segments[from]?.offset ?? 0) + seconds * charsPerSecond;

  if (target <= 0) return 0;
  const found = segments.findIndex((segment) => segment.offset + segment.text.length > target);
  return found === -1 ? segments.length - 1 : found;
}
