import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { kapwaIntents, kapwaQuickReplies } from '@/data/kapwa';
import { normalise, replyTo } from '@/lib/kapwa';

const sessionIds = (reply: ReturnType<typeof replyTo>) =>
  reply.actions.flatMap((action) => (action.type === 'session' ? [action.id] : []));

describe('replyTo', () => {
  it('says hello', () => {
    expect(replyTo('hi').intentId).toBe('greeting');
  });

  it('suggests breathing when someone is stressed', () => {
    const reply = replyTo('I feel so stressed today');
    expect(reply.intentId).toBe('stress');
    expect(sessionIds(reply)).toContain('box-breathing');
  });

  it('ignores case and punctuation', () => {
    expect(replyTo("CAN'T SLEEP!!!").intentId).toBe('sleep');
    expect(replyTo('I can’t sleep').intentId).toBe('sleep');
  });

  it('matches whole words only', () => {
    // "hi" inside "this", "rest" inside "interesting" — neither should fire.
    expect(replyTo('this is interesting').intentId).toBe('fallback');
  });

  it('puts self-harm before everything else', () => {
    const reply = replyTo('I am so stressed I want to die');
    expect(reply.intentId).toBe('crisis');
    expect(reply.actions).toEqual([]);
  });

  it('owns up when it does not understand', () => {
    expect(replyTo('purple elephants on bicycles').intentId).toBe('fallback');
    expect(replyTo('   ').intentId).toBe('fallback');
  });

  it('only mentions the support track where it is switched on', () => {
    expect(replyTo('I have chemo tomorrow').intentId).not.toBe('support');
    expect(replyTo('I have chemo tomorrow', { supportTrack: true }).intentId).toBe('support');
  });

  it('varies its answer when asked again', () => {
    expect(replyTo('stressed', { turn: 0 }).text).not.toBe(replyTo('stressed', { turn: 1 }).text);
  });

  it('is honest about what it is', () => {
    expect(replyTo('are you an AI?').text).toMatch(/not an AI/);
  });

  it('understands every quick reply it offers', () => {
    for (const quick of kapwaQuickReplies) {
      expect(replyTo(quick).intentId, quick).not.toBe('fallback');
    }
  });
});

describe('normalise', () => {
  it('tidies what people type', () => {
    expect(normalise('  Can’t   SLEEP?! ')).toBe("can't sleep");
  });
});

describe('the replies', () => {
  it('only suggest sessions that exist', () => {
    // Read the catalogue as text: it imports images, which tests cannot load.
    const catalogue = readFileSync(
      fileURLToPath(new URL('../data/meditations.ts', import.meta.url)),
      'utf8',
    );
    const known = new Set(
      [...catalogue.matchAll(/^\s{4}id: '([^']+)',\r?$/gm)].map((match) => match[1]),
    );
    expect(known.size).toBeGreaterThan(0);

    for (const intent of kapwaIntents) {
      for (const action of intent.actions ?? []) {
        if (action.type === 'session') expect(known.has(action.id), action.id).toBe(true);
      }
    }
  });
});
