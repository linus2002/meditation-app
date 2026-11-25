import { kapwaCatalogues, type KapwaCatalogue } from '@/data/kapwa-i18n';

/**
 * The languages Kapwa speaks: English, Filipino and Hindi.
 *
 * Kapwa thinks in English. Its intents, replies and buttons are written in
 * English, and each translation is looked up by that English text in the
 * language's catalogue (data/kapwa-i18n). A string with no translation yet is
 * shown in English, so a missing line never leaves a blank.
 *
 * Understanding doesn't depend on the chosen language: every message is read
 * against the English, Filipino and Hindi keywords together, so "di ako
 * makatulog", "neend nahi aa rahi" and "मुझे नींद नहीं आ रही" all reach the
 * sleep topic whatever language Kapwa replies in.
 *
 * Buttons Kapwa offers are kept in English in the chat's memory and shown
 * translated. Tapped, the English is what Kapwa reads, so a translation can
 * never send the conversation somewhere else.
 */

export type KapwaLanguage = 'en' | 'fil' | 'hi';

export interface KapwaLanguageInfo {
  id: KapwaLanguage;
  /** As the language calls itself. */
  name: string;
  /** In English, for screen readers and the code. */
  english: string;
  /** For dates and times. */
  locale: string;
  /** Translated without a native speaker's review yet: shown as Beta. */
  beta: boolean;
}

export const kapwaLanguages: KapwaLanguageInfo[] = [
  { id: 'en', name: 'English', english: 'English', locale: 'en', beta: false },
  { id: 'fil', name: 'Filipino', english: 'Filipino', locale: 'fil-PH', beta: true },
  { id: 'hi', name: 'हिन्दी', english: 'Hindi', locale: 'hi-IN', beta: true },
];

export function languageInfo(lang: KapwaLanguage): KapwaLanguageInfo {
  return kapwaLanguages.find((info) => info.id === lang) ?? kapwaLanguages[0];
}

export function isKapwaLanguage(value: unknown): value is KapwaLanguage {
  return value === 'en' || value === 'fil' || value === 'hi';
}

/** The language a phone set to Filipino or Hindi most likely wants; English otherwise. */
export function languageFromLocale(locale: string | undefined): KapwaLanguage {
  const code = (locale ?? '').toLowerCase();
  if (code.startsWith('fil') || code.startsWith('tl')) return 'fil';
  if (code.startsWith('hi')) return 'hi';
  return 'en';
}

export type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

function catalogue(lang: KapwaLanguage): KapwaCatalogue | undefined {
  return lang === 'en' ? undefined : kapwaCatalogues[lang];
}

/** Whether a translation exists for `source`; English always "has" its own. */
export function hasTranslation(lang: KapwaLanguage, source: string): boolean {
  return lang === 'en' || Boolean(catalogue(lang)?.strings[source]);
}

/**
 * `source` in `lang`, with `{name}`-style blanks filled. English when there
 * is no translation yet.
 */
export function tr(lang: KapwaLanguage, source: string, vars?: Vars): string {
  const translated = catalogue(lang)?.strings[source];
  return fill(translated ?? source, vars);
}

// ─── The language a reply is being written in ───────────────────────────────

/**
 * While Kapwa writes a reply, the language it writes in. Replies are built
 * synchronously, in one call (`converse`), so this is set for that call and
 * put back after it: everything the call reaches translates with `t` without
 * the language being passed through every function.
 */
let active: KapwaLanguage = 'en';

export function speaking<T>(lang: KapwaLanguage, write: () => T): T {
  const before = active;
  active = lang;
  try {
    return write();
  } finally {
    active = before;
  }
}

export function currentLanguage(): KapwaLanguage {
  return active;
}

/** `source` in the language Kapwa is speaking right now. */
export function t(source: string, vars?: Vars): string {
  return tr(active, source, vars);
}

// ─── Reading what was typed ─────────────────────────────────────────────────

/** Extra keywords for an intent, from every language's catalogue. */
export function keywordsIn(intentId: string): string[] {
  return Object.values(kapwaCatalogues).flatMap((found) => found.keywords[intentId] ?? []);
}

/** Short replies ("oo", "haan", "theek hai") of one kind, from every language. */
export function replyPhrasesIn(kind: string): string[] {
  return Object.values(kapwaCatalogues).flatMap((found) => found.replies?.[kind] ?? []);
}

const comparable = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`']/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();

let sources: Map<string, string> | null = null;

/**
 * The English a translated button or label came from, when `message` is
 * exactly one of them (as tapped, or typed out): "Oo, subukan natin" is
 * read as "Yes, let’s try it". Null for anything else.
 */
export function sourceOf(message: string): string | null {
  if (!sources) {
    sources = new Map();
    for (const found of Object.values(kapwaCatalogues)) {
      for (const [source, translated] of Object.entries(found.strings)) {
        // Only whole fixed strings; a template is never sent as a message.
        if (!source.includes('{')) sources.set(comparable(translated), source);
      }
    }
  }
  return sources.get(comparable(message)) ?? null;
}
