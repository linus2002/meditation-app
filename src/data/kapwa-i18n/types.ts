/**
 * A language's catalogue for Kapwa (see lib/kapwa-i18n), kept as JSON
 * (fil-topics.json, fil-core.json, hi-topics.json, hi-core.json).
 * `npm run kapwa:strings` lists what is left to translate.
 *
 * - `strings`: Kapwa's English text → the translation. The key must be the
 *   English exactly as Kapwa writes it, curly apostrophes and all; a test
 *   flags keys that no longer match anything. Blanks like `{name}` stay as
 *   they are, in whatever place the sentence needs them.
 * - `keywords`: intent id → words and short phrases in this language that
 *   mean it, matched like the English ones (whole words, small typos
 *   forgiven). Added to the English, never replacing it.
 * - `replies`: short answers by kind ("yes", "no", "better", "worse",
 *   "another", "shorter", "longer", "done", "enough"), read in context the
 *   way "yes" and "it helped" are.
 */
export interface KapwaCatalogue {
  strings: Record<string, string>;
  keywords: Record<string, string[]>;
  replies?: Record<string, string[]>;
}
