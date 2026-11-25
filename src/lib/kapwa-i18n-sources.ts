import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  crisisFollowUpReply,
  crisisReply,
  kapwaFallback,
  kapwaIntents,
  kapwaQuickReplies,
  kapwaWelcome,
  medicalUrgentReply,
  type KapwaIntent,
} from '@/data/kapwa';
import { practiceKinds, practices } from '@/data/kapwa-knowledge';
import { kapwaTopics } from '@/data/kapwa-topics';
import { crisisLines, emergencyLine } from '@/data/safety-lines';
import { soundscapes } from '@/lib/audio/soundscapes';
import { SHORTHAND } from '@/lib/kapwa';
import { REPLY_PHRASES, TOPIC_LABELS } from '@/lib/kapwa-dialogue';

/**
 * Every English string Kapwa can show, for translators and for the test that
 * checks the catalogues (lib/kapwa-i18n.test). Node only: it reads Kapwa's
 * source files for the sentences written in code.
 *
 * Grouped as the catalogues are split: `topics` (data/kapwa-topics and the
 * labels for them) and `core` (everything else).
 */

export type SourceGroup = 'topics' | 'core';

export interface IntentKeywords {
  id: string;
  /** The English keywords, as a guide to what the intent means. */
  english: string[];
}

export interface KapwaSources {
  strings: Record<SourceGroup, string[]>;
  keywords: Record<SourceGroup, IntentKeywords[]>;
}

/** Files whose prose is written in code: Kapwa's lines, the chat screen and the runner. */
const CODE_FILES = [
  'src/lib/kapwa-dialogue.ts',
  'src/lib/kapwa-profile.ts',
  'src/lib/kapwa-knowledge.ts',
  'src/lib/kapwa-runner.ts',
  'src/lib/kapwa.ts',
  'src/components/kapwa/kapwa-chat.tsx',
  'src/components/kapwa/practice-runner.tsx',
];

/**
 * Sentences in code: quoted strings with a space or a capital, minus class
 * names, paths, ids and other strings no one reads. Kapwa's prose is always
 * in single quotes; templates in backticks are never shown as written.
 */
export function codeStrings(root = process.cwd()): string[] {
  // Words Kapwa listens for, not says: keywords, short replies, shorthand.
  const heard = new Set([
    ...kapwaIntents.flatMap((intent) => intent.keywords),
    ...REPLY_PHRASES.flatMap(([, phrases]) => phrases),
    ...Object.values(SHORTHAND),
    // Asked of the engine internally, never shown.
    'a short meditation',
    'a long meditation',
  ]);
  const found = new Set<string>();
  for (const file of CODE_FILES) {
    const source = readFileSync(join(root, file), 'utf8')
      // Comments hold English too, but nobody reads it in the app.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
      const text = match[1].replace(/\\'/g, "'");
      if (!/[A-Za-z]/.test(text) || !/\s|^[A-Z]/.test(text)) continue;
      if (heard.has(text)) continue;
      // Regular expressions and their replacements.
      if (/\/[gu]*,?\s*$|[\]|$\\]|^The $|^NFKD$|^use client$/.test(text)) continue;
      if (/^[@./#]|^https?:|[{}]\s*$|^\w+:\w|^[a-z-]+\/|\.(ts|tsx|json)$/.test(text) && !/\{\w+\}/.test(text)) continue;
      // Tailwind class names and CSS.
      if (/\b(flex|grid|rounded|text-|bg-|px-|py-|mt-|h-|w-|gap-|border|shadow|focus-visible|hover:|items-|justify-|transition|font-|leading-|tabular|scale-|opacity|sr-only|duration|ease-)/.test(text)) continue;
      // Ids and storage keys.
      if (/^[a-z][a-z0-9-]*(:[a-z0-9-]+)?$|^serenity\.|^[a-z]+(-[a-z]+)+$/.test(text)) continue;
      found.add(text);
    }
  }
  return [...found];
}

const isTopic = new Set(kapwaTopics.map((topic) => topic.id));

/** Labels on the "go to a screen" buttons of an intent. */
const pageLabels = (intent: KapwaIntent) => (intent.actions ?? []).flatMap((action) => (action.type === 'page' ? [action.label] : []));

function intentStrings(intent: KapwaIntent): string[] {
  return [...intent.replies.filter(Boolean), ...(intent.suggestions ?? []), ...pageLabels(intent)];
}

export function kapwaSources(root = process.cwd()): KapwaSources {
  const topics = new Set<string>();
  const core = new Set<string>();
  const add = (set: Set<string>, ...texts: string[]) => texts.filter((text) => text.trim()).forEach((text) => set.add(text));

  for (const intent of kapwaIntents) add(isTopic.has(intent.id) ? topics : core, ...intentStrings(intent));
  add(topics, ...Object.values(TOPIC_LABELS));

  for (const practice of practices) {
    add(core, practice.title, practice.summary, ...practice.steps.map((step) => step.text));
    if (practice.caution) add(core, practice.caution);
    for (const action of practice.related) if (action.type === 'page') add(core, action.label);
  }
  add(core, ...Object.values(practiceKinds).map((kind) => kind.title));

  // Fixed replies, and the welcome as it greets someone by name.
  add(core, kapwaWelcome.text, kapwaWelcome.text.replace(/^Hi, I’m Kapwa\./, 'Hi {name}, I’m Kapwa.'));
  add(core, ...kapwaQuickReplies, crisisReply.text, crisisFollowUpReply.text, medicalUrgentReply.text, kapwaFallback.text);
  // The greeting with the reader's name in it (lib/kapwa-dialogue `withState`).
  for (const reply of kapwaIntents.find((intent) => intent.id === 'greeting')?.replies ?? []) {
    add(core, reply.replace(/^(Hi there|Hello again)\./, '$1, {name}.'));
  }
  add(core, ...[...crisisLines, emergencyLine].map((line) => line.label));
  add(core, ...Object.values(soundscapes).map((sound) => sound.name));

  for (const text of codeStrings(root)) if (!topics.has(text)) core.add(text);

  const keywords = (filter: (intent: KapwaIntent) => boolean) =>
    kapwaIntents.filter(filter).map((intent) => ({ id: intent.id, english: intent.keywords }));

  return {
    strings: { topics: [...topics], core: [...core] },
    keywords: {
      topics: keywords((intent) => isTopic.has(intent.id)),
      core: keywords((intent) => !isTopic.has(intent.id)),
    },
  };
}
