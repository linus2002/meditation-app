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
    expect(sessionIds(reply)).toEqual([]);
  });

  it('gives a crisis a number to call, never a session', () => {
    const reply = replyTo('want to die');
    const calls = reply.actions.filter((action) => action.type === 'call');
    expect(calls.length).toBeGreaterThan(0);
    expect(reply.actions.every((action) => action.type === 'call')).toBe(true);
  });

  it('recognises the ways people actually say it', () => {
    for (const phrase of [
      'I can’t go on like this',
      'everyone would be better off without me',
      'there is no point living anymore',
      'I just dont want to be here anymore',
    ]) {
      expect(replyTo(phrase).intentId, phrase).toBe('crisis');
    }
  });

  it('sends medical warning signs to the care team, not a meditation', () => {
    for (const phrase of [
      'I have a fever after chemo',
      'my chest pain is back',
      'I cant breathe properly',
      'there is bleeding that will not stop',
      'I keep throwing up',
      'stressed and short of breath',
    ]) {
      const reply = replyTo(phrase, { supportTrack: true });
      expect(reply.intentId, phrase).toBe('medical-urgent');
      expect(sessionIds(reply), phrase).toEqual([]);
      expect(reply.actions.some((action) => action.type === 'call'), phrase).toBe(true);
    }
  });

  it('still lets self-harm win over a medical sign', () => {
    expect(replyTo('I have a fever and I want to die').intentId).toBe('crisis');
  });

  it('does not treat a routine blood test as urgent', () => {
    expect(replyTo('I have a blood test tomorrow').intentId).not.toBe('medical-urgent');
  });

  it('points everyday pain to the care team before offering anything', () => {
    const reply = replyTo('my back is sore and I have a headache');
    expect(reply.intentId).toBe('pain');
    expect(reply.text).toMatch(/care team/);
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
    // The content pulled from Sanity, read as JSON. Guards against a session
    // Kapwa names being renamed or removed in the Studio.
    const content = JSON.parse(
      readFileSync(fileURLToPath(new URL('../content/content.json', import.meta.url)), 'utf8'),
    ) as { meditations: { id: string }[] };
    const known = new Set(content.meditations.map((item) => item.id));
    expect(known.size).toBeGreaterThan(0);

    for (const intent of kapwaIntents) {
      for (const action of intent.actions ?? []) {
        if (action.type === 'session') expect(known.has(action.id), action.id).toBe(true);
      }
    }
  });
});
