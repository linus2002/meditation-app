import filCore from './fil-core.json';
import filTopics from './fil-topics.json';
import hiCore from './hi-core.json';
import hiTopics from './hi-topics.json';
import type { KapwaCatalogue } from './types';

export type { KapwaCatalogue } from './types';

/**
 * Kapwa's Filipino and Hindi, each in two halves: `topics` (the written
 * answers in data/kapwa-topics) and `core` (everything else). Plain JSON, so
 * a translator can edit them without touching code. Both are BETA until a
 * native speaker has checked them.
 */

/** Halves of one language's catalogue, merged; keywords for the same intent are added together. */
function merge(...parts: KapwaCatalogue[]): KapwaCatalogue {
  const merged: KapwaCatalogue = { strings: {}, keywords: {}, replies: {} };
  for (const part of parts) {
    Object.assign(merged.strings, part.strings);
    for (const [id, words] of Object.entries(part.keywords)) merged.keywords[id] = [...(merged.keywords[id] ?? []), ...words];
    for (const [kind, words] of Object.entries(part.replies ?? {})) merged.replies![kind] = [...(merged.replies![kind] ?? []), ...words];
  }
  return merged;
}

export const kapwaCatalogues: Record<'fil' | 'hi', KapwaCatalogue> = {
  fil: merge(filTopics as KapwaCatalogue, filCore as KapwaCatalogue),
  hi: merge(hiTopics as KapwaCatalogue, hiCore as KapwaCatalogue),
};
