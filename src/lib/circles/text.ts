/**
 * What may be written into a circle: one-line prompt answers and display names.
 *
 * Mirrors the checks on `prompt_responses.body` and `profiles.display_name` in
 * the migrations, so a reader hears about a problem as they type rather than
 * from a refused request. The server still enforces every rule on its own.
 *
 * Lengths are counted in characters as Postgres counts them (code points), so
 * an answer of emoji is not cut off at half the length of an answer of letters.
 */

export const ANSWER_MAX = 140;
export const NAME_MAX = 32;

const LINK = /(https?:\/\/|www\.)/i;

export type TextProblem = 'empty' | 'too-long' | 'link';

/** Trims, and folds line breaks and runs of spaces into single spaces. */
export function normaliseAnswer(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function check(text: string, max: number): TextProblem | null {
  const normalised = normaliseAnswer(text);
  if (normalised.length === 0) return 'empty';
  if ([...normalised].length > max) return 'too-long';
  if (LINK.test(normalised)) return 'link';
  return null;
}

export function validateAnswer(text: string): TextProblem | null {
  return check(text, ANSWER_MAX);
}

export function validateDisplayName(text: string): TextProblem | null {
  return check(text, NAME_MAX);
}

/** Characters used, as the counter under the answer field shows it. */
export function characterCount(text: string): number {
  return [...normaliseAnswer(text)].length;
}
