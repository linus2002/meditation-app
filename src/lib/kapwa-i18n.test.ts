import { describe, expect, it } from 'vitest';

import { kapwaCatalogues } from '@/data/kapwa-i18n';
import { kapwaIntents, kapwaQuickReplies } from '@/data/kapwa';
import { kapwaTopics } from '@/data/kapwa-topics';
import { matchWords, rankIntents } from '@/lib/kapwa';
import { converse, TOPIC_LABELS } from '@/lib/kapwa-dialogue';
import { languageFromLocale, sourceOf, speaking, t, tr, type KapwaLanguage } from '@/lib/kapwa-i18n';
import { kapwaSources } from '@/lib/kapwa-i18n-sources';
import { readGivenName } from '@/lib/kapwa-profile';

const LANGUAGES = ['fil', 'hi'] as const;
const sources = kapwaSources();
const allSources = [...sources.strings.topics, ...sources.strings.core];
const blanks = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('translating', () => {
  it('falls back to English for a line with no translation', () => {
    expect(tr('fil', 'A line nobody has translated, {name}.', { name: 'Ana' })).toBe('A line nobody has translated, Ana.');
  });

  it('speaks a language only for the reply being written', () => {
    const line = 'Take care of yourself. Come back any time.';
    expect(speaking('hi', () => t(line))).toBe(tr('hi', line));
    expect(t(line)).toBe(line);
  });

  it('picks the language from the phone', () => {
    expect(languageFromLocale('fil-PH')).toBe('fil');
    expect(languageFromLocale('tl')).toBe('fil');
    expect(languageFromLocale('hi-IN')).toBe('hi');
    expect(languageFromLocale('en-PH')).toBe('en');
    expect(languageFromLocale(undefined)).toBe('en');
  });
});

describe.each(LANGUAGES)('the %s catalogue', (lang) => {
  const catalogue = kapwaCatalogues[lang];

  it('translates every line Kapwa can show', () => {
    const missing = allSources.filter((text) => !catalogue.strings[text]);
    expect(missing).toEqual([]);
  });

  it('has no keys that match nothing, which would mean the English changed', () => {
    expect(Object.keys(catalogue.strings).filter((key) => !allSources.includes(key))).toEqual([]);
  });

  it('keeps every blank, so names and numbers are filled in', () => {
    const broken = Object.entries(catalogue.strings).filter(([source, translated]) => blanks(source).join() !== blanks(translated).join());
    expect(broken.map(([source]) => source)).toEqual([]);
  });

  it('keeps numbered steps numbered', () => {
    const lost = Object.entries(catalogue.strings).filter(
      ([source, translated]) => (source.match(/^\d+\. /gm) ?? []).length !== (translated.match(/^\d+\. /gm) ?? []).length,
    );
    expect(lost.map(([source]) => source.slice(0, 60))).toEqual([]);
  });

  it('adds keywords only to intents that exist', () => {
    const ids = new Set(kapwaIntents.map((intent) => intent.id));
    expect(Object.keys(catalogue.keywords).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('understands each of its own keywords as the intent it was written for', () => {
    // On a tie between equally good intents either is fine: the test is that
    // a keyword never pulls clearly towards something else.
    const misread = Object.entries(catalogue.keywords).flatMap(([id, words]) =>
      words.flatMap((word) => {
        const { ranked } = rankIntents(word, { supportTrack: true });
        const best = ranked[0]?.score ?? 0;
        const top = ranked.filter((entry) => entry.score === best).map((entry) => entry.intent.id);
        return top.includes(id) ? [] : [`${word} → ${top.join(' | ') || 'nothing'} (want ${id})`];
      }),
    );
    expect(misread).toEqual([]);
  });

  it('reads a translated button as the English it shows', () => {
    const buttons = [
      ...kapwaQuickReplies,
      ...Object.values(TOPIC_LABELS),
      ...kapwaTopics.flatMap((topic) => topic.suggestions ?? []),
      'Yes, let’s try it',
      'It didn’t help',
      'Who am I?',
    ];
    for (const button of buttons) {
      const shown = tr(lang, button);
      // Two buttons may share a translation; either English is a faithful reading.
      const read = sourceOf(shown);
      expect(read === button || (read !== null && tr(lang, read) === shown)).toBe(true);
      expect(converse(shown, { lang }).intentId).toBe(converse(button, { lang }).intentId);
    }
  });
});

describe('replying in another language', () => {
  const ask = (message: string, lang: KapwaLanguage) => converse(message, { lang });

  it('answers in the chosen language and understands any of them', () => {
    const english = converse('I can’t sleep');
    for (const message of ['I can’t sleep', 'hindi ako makatulog', 'neend nahi aa rahi', 'मुझे नींद नहीं आ रही']) {
      const reply = ask(message, 'hi');
      expect(reply.intentId).toBe(english.intentId);
      expect(reply.text).toBe(tr('hi', english.text));
    }
  });

  it('keeps buttons in English underneath, to be shown translated', () => {
    const reply = ask('I feel overwhelmed', 'fil');
    expect(reply.suggestions?.every((suggestion) => allSources.includes(suggestion))).toBe(true);
  });

  it('gives a crisis reply in the language, with the English and the numbers to call', () => {
    for (const lang of LANGUAGES) {
      const reply = ask('मैं मरना चाहता हूँ', lang);
      expect(reply.intentId).toBe('crisis');
      expect(reply.text).toContain(converse('I want to die').text);
      expect(reply.text.startsWith(tr(lang, converse('I want to die').text))).toBe(true);
      expect(reply.actions.every((action) => action.type === 'call')).toBe(true);
    }
  });

  it('teaches a practice in the language', () => {
    const reply = ask('box breathing', 'hi');
    expect(reply.text).toContain(tr('hi', 'Box breathing'));
    expect(reply.text).toContain(tr('hi', 'Breathe in through your nose for a count of 4.'));
  });

  it('greets by name in the language', () => {
    const reply = converse('hello', { lang: 'fil', profile: { name: 'Ana' } as never });
    expect(reply.text).toContain('Ana');
    expect(reply.text).not.toMatch(/^Hi there/);
  });
});

describe('learning a name in any language', () => {
  it.each([
    ['tawagin mo akong Ana', 'Ana'],
    ['ang pangalan ko ay Carla', 'Carla'],
    ['mera naam Rahul hai', 'Rahul'],
    ['mujhe Priya bulao', 'Priya'],
    ['मेरा नाम राहुल है', 'राहुल'],
  ])('reads %j as %j', (message, name) => {
    expect(readGivenName(message)).toBe(name);
  });

  it.each(['mujhe neend nahi aa rahi', 'मुझे बहुत डर है'])('finds no name in %j', (message) => {
    expect(readGivenName(message)).toBeNull();
  });
});

describe('reading Hindi', () => {
  it('reads the different spellings of the same word alike', () => {
    expect(matchWords('मैं ठीक हूँ')).toEqual(matchWords('मैं ठीक हूं'));
    expect(matchWords('ज़्यादा')).toEqual(matchWords('ज्यादा'));
  });

  it('splits on the Hindi full stop', () => {
    expect(matchWords('नमस्ते। कैसे हो')).toHaveLength(3);
  });
});
