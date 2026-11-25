/**
 * Writes every English string Kapwa can show, and each intent's English
 * keywords, as JSON for translators, and says how much of each language is
 * translated.
 *
 *   npm run kapwa:strings -- OUT_DIR    writes topics.json and core.json
 *   npm run kapwa:strings               coverage only
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { kapwaCatalogues } from '../../src/data/kapwa-i18n';
import { kapwaSources } from '../../src/lib/kapwa-i18n-sources';

const sources = kapwaSources();
const out = process.argv[2];

if (out) {
  mkdirSync(out, { recursive: true });
  for (const group of ['topics', 'core'] as const) {
    const file = join(out, `${group}.json`);
    writeFileSync(file, `${JSON.stringify({ strings: sources.strings[group], keywords: sources.keywords[group] }, null, 2)}\n`);
    console.log(`${file}: ${sources.strings[group].length} strings, ${sources.keywords[group].length} intents`);
  }
}

const all = [...sources.strings.topics, ...sources.strings.core];
for (const [lang, catalogue] of Object.entries(kapwaCatalogues)) {
  const done = all.filter((text) => catalogue.strings[text]).length;
  const stale = Object.keys(catalogue.strings).filter((key) => !all.includes(key));
  console.log(`${lang}: ${done}/${all.length} strings translated, ${Object.keys(catalogue.keywords).length} intents with keywords, ${stale.length} keys matching nothing`);
  for (const key of stale.slice(0, 10)) console.log(`  stale: ${key.slice(0, 80)}`);
}
