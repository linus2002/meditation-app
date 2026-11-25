import { describe, expect, it } from 'vitest';

import { kapwaQuickReplies } from '@/data/kapwa';
import { converse, readReply, TOPIC_LABELS, type DialogueMemory, type DialogueTurn } from '@/lib/kapwa-dialogue';
import { rankIntents, replyTo } from '@/lib/kapwa';
import { kapwaTopics } from '@/data/kapwa-topics';

/** Plays a conversation the way the chat does: each turn sees the memory of the one before. */
function conversation(...messages: string[]): DialogueTurn[] {
  let last: DialogueMemory | undefined;
  const earlier: string[] = [];
  return messages.map((message, turn) => {
    const reply = converse(message, { last, earlier: [...earlier], turn });
    last = reply.memory;
    earlier.push(reply.intentId);
    return reply;
  });
}

describe('a conversation', () => {
  it('offers a practice, teaches it on “yes”, and follows up', () => {
    const [topic, taught, after, close] = conversation('I feel so overwhelmed', 'yes', 'a bit better', 'that’s enough for now');
    expect(topic.intentId).toBe('overwhelmed');
    expect(topic.memory.state).toBe('offering');
    expect(topic.followUp).toMatch(/double sigh/);

    expect(taught.intentId).toBe('practice:double-sigh');
    expect(taught.memory.state).toBe('exercise');
    expect(taught.text).toMatch(/^The double sigh · about 1 min/);
    expect(taught.followUp).toBeTruthy();

    expect(after.memory.state).toBe('follow-up');
    expect(after.followUp).toMatch(/short guided meditation|short meditation/);

    expect(close.memory.state).toBe('closing');
  });

  it('offers something different when a practice didn’t help, and says more the second time', () => {
    const turns = conversation('help me calm down right now', 'yes', 'it didn’t help', 'yes', 'still the same');
    expect(turns[2].memory.state).toBe('offering');
    expect(turns[2].memory.practiceId).not.toBe('double-sigh');
    expect(turns[3].memory.state).toBe('exercise');
    expect(turns[4].memory.misses).toBe(2);
    expect(turns[4].text).toMatch(/talking to someone you trust or a professional/);
  });

  it('asks how it went when someone says they’re done', () => {
    const [, , done, feel] = conversation('I can’t sleep', 'yes', 'done', 'calmer');
    expect(done.text).toMatch(/How (do you feel|are you feeling) now/);
    expect(done.suggestions).toEqual(['Calmer', 'About the same', 'Worse']);
    expect(feel.memory.state).toBe('follow-up');
  });

  it('gives another practice on “another”', () => {
    const [, first, second] = conversation('box breathing', 'another one', 'another');
    expect(first.intentId).toMatch(/^practice:/);
    expect(first.intentId).not.toBe('practice:box-breathing');
    expect(second.intentId).not.toBe(first.intentId);
  });

  it('respects “not now”, offering to talk or listen', () => {
    const [, notNow, listen] = conversation('I feel lonely', 'not right now', 'Something calming to listen to');
    expect(notNow.memory.state).toBe('clarifying');
    expect(notNow.suggestions).toEqual(['I’d like to talk', 'Something calming to listen to']);
    expect(listen.intentId).toBe('sounds');
    expect(conversation('I feel lonely', 'no', 'I’d like to talk')[2].intentId).toBe('just-talk');
  });

  it('finds a shorter practice or session on “shorter”', () => {
    const [, practice] = conversation('body scan', 'too long');
    expect(practice.memory.state).toBe('exercise');
    expect(practice.text).not.toMatch(/^Body scan/);
  });

  it('reads a short reply on its own when there is nothing to answer', () => {
    expect(converse('yes').memory.state).toBe('understanding');
    expect(converse('yes').suggestions).toEqual(kapwaQuickReplies);
    expect(converse('no').memory.state).toBe('closing');
  });

  it('still answers a new need in the middle of a practice', () => {
    const [, , change] = conversation('box breathing', 'ok', 'actually I miss my mom so much');
    expect(change.intentId).toBe('missing-someone');
  });

  it('says something different when a topic comes up again', () => {
    const [first, , again] = conversation('I feel lonely', 'not right now', 'I feel lonely');
    expect(again.text).not.toBe(first.text);
    expect(again.text).toMatch(/earlier|before/);
    expect(again.memory.practiceId).not.toBe(first.memory.practiceId);
  });

  it('keeps safety first at every step', () => {
    const turns = conversation('I feel overwhelmed', 'yes', 'no it made it worse, I want to die');
    expect(turns[2].intentId).toBe('crisis');
    expect(turns[2].memory.state).toBe('safety');
    expect(turns[2].actions.every((action) => action.type === 'call')).toBe(true);
  });

  it('varies its own wording from turn to turn', () => {
    const a = converse('I feel lonely', { turn: 0 }).followUp;
    const b = converse('I feel lonely', { turn: 1 }).followUp;
    expect(a).not.toBe(b);
  });
});

describe('reading short replies', () => {
  it.each([
    ['yes', 'yes'], ['sure', 'yes'], ['ok lets do it', 'yes'], ['sige', 'yes'],
    ['no', 'no'], ['not right now', 'no'], ['maybe later', 'no'],
    ['a bit better', 'better'], ['calmer', 'better'], ['yes it helped', 'better'],
    ['not better', 'worse'], ['it didnt help', 'worse'], ['about the same', 'worse'],
    ['another one', 'another'], ['something different', 'another'],
    ['too long', 'shorter'], ['done', 'done'], ['thats enough for now', 'enough'],
  ])('“%s” is %s', (text, kind) => {
    expect(readReply(text)?.kind).toBe(kind);
  });

  it('leaves longer messages to the intent engine', () => {
    expect(readReply('yes I have been feeling really anxious about my exams lately and cannot focus')).toBeNull();
  });
});

describe('asking instead of guessing', () => {
  it('asks which topic when two fit equally', () => {
    // Searching for a message that ties two topics, from the labels themselves.
    const tie = converse('lonely and overwhelmed');
    expect(tie.memory.state).toBe('clarifying');
    expect(tie.memory.options).toHaveLength(2);
    expect(tie.suggestions).toEqual(tie.memory.options!.map((id) => TOPIC_LABELS[id]));
  });

  it('answers the option chosen', () => {
    const [ask, chosen] = conversation('lonely and overwhelmed', TOPIC_LABELS.lonely);
    expect(ask.memory.state).toBe('clarifying');
    expect(chosen.intentId).toBe('lonely');
  });

  it('answers a single typo directly', () => {
    expect(converse('overthnking').intentId).toBe('overthinking');
  });

  it('understands negation', () => {
    expect(converse('I’m not stressed, just tired').intentId).not.toBe('stress');
    expect(converse('I am not sad').intentId).toBe('not-weighing');
    // Where the negation is the problem, it stays.
    expect(converse('I am not sleeping well').intentId).toMatch(/sleep/);
    expect(replyTo('I feel like I’m not good enough').intentId).toBe('not-good-enough');
  });
});

describe('topic labels', () => {
  it('has one for every topic, each understood as that topic', () => {
    for (const topic of kapwaTopics) {
      const label = TOPIC_LABELS[topic.id];
      expect(label, topic.id).toBeTruthy();
      expect(rankIntents(label).ranked[0]?.intent.id, `${topic.id}: ${label}`).toBe(topic.id);
    }
  });
});

describe('never dismissive', () => {
  it('reads “never good enough” as the pain it is', () => {
    expect(converse('i never feel good enough').intentId).toBe('not-good-enough');
    expect(converse('i dont feel worthy of anything').intentId).not.toBe('not-weighing');
  });

  it('answers a denied feeling without saying it is glad', () => {
    expect(converse('I am not sad').text).not.toMatch(/glad/i);
  });
});
