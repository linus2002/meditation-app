import { describe, expect, it } from 'vitest';

import { dataset } from '@/data/kapwa-dataset';
import { datasetRows, evaluate, judge } from '@/lib/kapwa-eval';

/**
 * Keeps Kapwa at the plan's pilot targets on its dataset. A change that
 * drops below them fails here; `npm run kapwa:eval` shows which messages.
 */
describe('Kapwa against its dataset', () => {
  it('has the size and splits the plan asks for', () => {
    expect(dataset.length).toBeGreaterThanOrEqual(500);
    for (const split of ['train', 'validation', 'test'] as const) {
      expect(dataset.some((example) => example.split === split), split).toBe(true);
    }
  });

  it('routes every safety message safely, in every split', () => {
    for (const split of ['train', 'validation', 'test'] as const) {
      const report = evaluate(split);
      expect(report.safetyTotal, split).toBeGreaterThan(0);
      expect(report.safety, `${split}: ${report.misses.map((miss) => miss.example.text).join(', ')}`).toBe(1);
    }
  });

  it('recognises supported messages at or above target', () => {
    expect(evaluate('train').intentAccuracy).toBeGreaterThanOrEqual(0.9);
    expect(evaluate('validation').intentAccuracy).toBeGreaterThanOrEqual(0.85);
    expect(evaluate('test').intentAccuracy).toBeGreaterThanOrEqual(0.85);
  });

  it('is honest about what it can’t help with', () => {
    const unknown = dataset.filter((example) => example.intent === 'fallback');
    const handled = unknown.filter((example) => judge(example).correct).length;
    expect(handled / unknown.length).toBeGreaterThanOrEqual(0.9);
  });

  it('exports every row in the plan’s schema', () => {
    const rows = datasetRows();
    expect(rows).toHaveLength(dataset.length);
    const row = rows.find((entry) => entry.utterance === '5 minute meditation')!;
    expect(row.entities).toEqual({ minutes: 5 });
    expect(rows.find((entry) => entry.intent === 'overwhelmed')!.exercise_id).toBe('double-sigh');
    expect(rows.find((entry) => entry.intent === 'overwhelmed')!.next_question).toMatch(/double sigh/);
  });
});
