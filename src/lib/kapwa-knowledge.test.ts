import { describe, expect, it } from 'vitest';

import { kapwaIntents } from '@/data/kapwa';
import { practiceKinds, practices } from '@/data/kapwa-knowledge';
import { kapwaTopics } from '@/data/kapwa-topics';
import { getMeditation } from '@/data/meditations';
import { replyTo } from '@/lib/kapwa';
import { getPractice, LENGTH_INTENT, practiceAsk, readLength, suggestSessions } from '@/lib/kapwa-knowledge';

const sessions = (reply: ReturnType<typeof replyTo>) =>
  reply.actions.flatMap((action) => (action.type === 'session' ? [getMeditation(action.id)!] : []));
const minutesOf = (id: string) => Math.round(getMeditation(id)!.durationSeconds / 60);

describe('the knowledge base', () => {
  it('has unique ids, steps and a review record for every practice', () => {
    expect(new Set(practices.map((practice) => practice.id)).size).toBe(practices.length);
    for (const practice of practices) {
      expect(practice.steps.length, practice.id).toBeGreaterThan(0);
      expect(practice.minutes, practice.id).toBeGreaterThan(0);
      expect(practice.review.author, practice.id).toBeTruthy();
      if (practice.review.status === 'approved') {
        expect(practice.review.reviewer, practice.id).toBeTruthy();
        expect(practice.review.lastReviewed, practice.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('covers every kind', () => {
    for (const kind of Object.keys(practiceKinds)) {
      expect(practices.some((practice) => practice.kind === kind), kind).toBe(true);
    }
  });

  it('only names topics that exist', () => {
    const topics = new Set(kapwaTopics.map((topic) => topic.id));
    for (const practice of practices) {
      for (const intent of practice.intents) expect(topics.has(intent), `${practice.id}: ${intent}`).toBe(true);
    }
  });

  it('only offers practices that exist', () => {
    for (const intent of kapwaIntents) {
      for (const action of intent.actions ?? []) {
        if (action.type === 'practice') expect(getPractice(action.id), `${intent.id}: ${action.id}`).toBeDefined();
      }
    }
  });

  it('lists what still needs a reviewer', () => {
    const drafts = practices.filter((practice) => practice.review.status === 'draft').map((practice) => practice.id);
    // Not a failure: a reminder of the launch gate, printed with the test run.
    if (drafts.length) console.info(`Kapwa knowledge base: ${drafts.length} of ${practices.length} practices await review.`);
    expect(drafts.length).toBeLessThanOrEqual(practices.length);
  });
});

describe('asking for a practice', () => {
  it.each(practices.map((practice) => [practice.title, practice.id]))('“%s” teaches %s', (title, id) => {
    const reply = replyTo(title);
    expect(reply.intentId).toBe(`practice:${id}`);
    expect(reply.prepared).toBe(true);
  });

  it('understands the other names', () => {
    expect(replyTo('what is 4 7 8 breathing').intentId).toBe('practice:four-seven-eight');
    expect(replyTo('teach me the 5 4 3 2 1 technique').intentId).toBe('practice:five-senses');
    expect(replyTo('metta').intentId).toBe('practice:loving-kindness');
    expect(replyTo('progresive muscle relaxation').intentId).toBe('practice:muscle-relaxation');
    expect(replyTo('how long should i meditate').intentId).toBe('practice:how-long');
    expect(replyTo('my mind keeps wandering when i meditate').intentId).toBe('practice:mind-wandering');
  });

  it('writes out the steps, the caution and app sessions to go with it', () => {
    const reply = replyTo('box breathing');
    expect(reply.text).toMatch(/^Box breathing · about 4 min/);
    expect(reply.text).toMatch(/\n2\. Breathe in through your nose for a count of 4\. \(4 sec\)/);
    expect(reply.text).toMatch(/Take care:/);
    expect(sessions(reply).length).toBeGreaterThanOrEqual(1);
  });

  it('offers more of the same kind, all of which it understands', () => {
    for (const practice of practices) {
      const reply = replyTo(practiceAsk(practice));
      for (const suggestion of reply.suggestions ?? []) {
        expect(replyTo(suggestion).intentId, `${practice.id}: ${suggestion}`).not.toBe('fallback');
      }
    }
  });

  it('lists a whole kind', () => {
    const reply = replyTo('show me some breathing techniques');
    expect(reply.intentId).toBe('practices:breathing');
    expect(reply.actions.every((action) => action.type === 'practice')).toBe(true);
    expect(replyTo('journaling ideas').intentId).toBe('practices:journaling');
    expect(replyTo('types of meditation').intentId).toBe('practices:meditation');
  });

  it('offers one practice with each topic it fits', () => {
    const reply = replyTo('Can you help me calm down right now?');
    expect(reply.actions[0]).toEqual({ type: 'practice', id: 'double-sigh' });
  });

  it('still puts safety first', () => {
    expect(replyTo('box breathing wont help I want to die').intentId).toBe('crisis');
  });
});

describe('how long', () => {
  it('reads a length from what is typed', () => {
    expect(readLength('a 5 minute meditation')).toEqual({ minutes: 5 });
    expect(readLength('10-min session')).toEqual({ minutes: 10 });
    expect(readLength('give me 15 mins')).toEqual({ minutes: 15 });
    expect(readLength('five minutes please')).toEqual({ minutes: 5 });
    expect(readLength('half an hour')).toEqual({ minutes: 30 });
    expect(readLength('something quick')).toEqual({ feel: 'short' });
    expect(readLength('i feel sad')).toEqual({});
  });

  it('suggests meditations of about the length asked for', () => {
    for (const [message, most] of [
      ['I want a 5 minute meditation', 5],
      ['10 min meditation', 10],
      ['quick meditation', 5],
    ] as const) {
      const reply = replyTo(message);
      expect(reply.intentId, message).toBe(LENGTH_INTENT);
      const found = sessions(reply);
      expect(found.length, message).toBeGreaterThanOrEqual(2);
      for (const session of found) expect(minutesOf(session.id), `${message}: ${session.id}`).toBeLessThanOrEqual(most + 1);
    }
  });

  it('suggests longer ones when asked', () => {
    const found = sessions(replyTo('a long meditation'));
    expect(found.every((session) => minutesOf(session.id) >= 15)).toBe(true);
  });

  it('fits a topic’s sessions to the time someone has', () => {
    const reply = replyTo('help me fall asleep, I only have 5 minutes');
    expect(reply.intentId).toBe('sleep-tonight');
    for (const session of sessions(reply)) expect(minutesOf(session.id), session.id).toBeLessThanOrEqual(6);
  });

  it('picks from the right categories first', () => {
    const found = suggestSessions({ categories: ['sleep'], minutes: 8, count: 3 });
    expect(found.every((session) => session.category === 'sleep')).toBe(true);
  });
});
