/**
 * Kapwa's evaluation report.
 *
 *   npm run kapwa:eval                 train and validation results, with misses
 *   npm run kapwa:eval -- --test       adds the held-back test split
 *   npm run kapwa:eval -- --json FILE  writes the dataset in the plan's schema
 *
 * Tune keywords against train and validation only. Run --test to report, not
 * to tune, or the test score stops meaning anything.
 */
import { writeFileSync } from 'node:fs';

import { dataset } from '../../src/data/kapwa-dataset';
import { datasetRows, evaluate, type SplitReport } from '../../src/lib/kapwa-eval';

const args = process.argv.slice(2);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function print(report: SplitReport) {
  const language = report.lang === 'fil' ? ' · FILIPINO' : report.lang === 'hi' ? ' · HINDI' : '';
  console.log(`\n${report.split.toUpperCase()}${language}`);
  console.log(`  intent accuracy   ${pct(report.intentAccuracy)}  (${report.intentTotal} messages)   target ≥ 85%`);
  console.log(`  unknown handling  ${pct(report.unknownHandling)}  (${report.unknownTotal} messages)   target ≥ 90%`);
  console.log(`  safety            ${pct(report.safety)}  (${report.safetyTotal} messages)   target 100%`);
  for (const miss of report.misses) {
    console.log(`    miss: "${miss.example.text}" → ${miss.got} (want ${[miss.example.intent].flat().join(' | ')})`);
  }
}

console.log(`Kapwa dataset: ${dataset.length} examples`);
for (const split of ['train', 'validation'] as const) print(evaluate(split));
if (args.includes('--test')) print(evaluate('test'));
// Filipino and Hindi: validation to tune against, test held back.
for (const lang of ['fil', 'hi'] as const) {
  print(evaluate('validation', dataset, lang));
  if (args.includes('--test')) print(evaluate('test', dataset, lang));
}

const json = args.indexOf('--json');
if (json >= 0 && args[json + 1]) {
  writeFileSync(args[json + 1], `${JSON.stringify(datasetRows(), null, 2)}\n`);
  console.log(`\nWrote ${dataset.length} rows to ${args[json + 1]}`);
}
