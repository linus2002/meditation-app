import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { kapwaIntents, kapwaQuickReplies } from '@/data/kapwa';
import { kapwaTopics } from '@/data/kapwa-topics';
import { soundscapes } from '@/lib/audio/soundscapes';
import { keywordScore, matchWords, PREPARED_MAX_WORDS, replyTo } from '@/lib/kapwa';

/** The questions people bring, each with the topic that should answer it. */
const QUESTIONS: [string, string][] = [
  // Stressed or overwhelmed
  ['Why do I feel overwhelmed even when I’m not doing that much?', 'overwhelmed'],
  ['Can you help me calm down right now?', 'calm-now'],
  ['How do I stop overthinking everything?', 'overthinking'],
  ['I feel like everything is happening all at once. What should I do?', 'overwhelmed'],
  ['Why am I mentally exhausted even though I haven’t done anything physically tiring?', 'mental-exhaustion'],
  ['How can I stop worrying about things I can’t control?', 'worry-control'],
  ['Can you guide me through a 5-minute breathing exercise?', 'breathing-exercise'],
  ['How do I deal with pressure without burning myself out?', 'pressure-burnout'],
  ['Why do I feel like I need to fix everything immediately?', 'fix-everything'],
  ['Can you help me clear my mind before I continue my day?', 'clear-mind'],
  // Sad or emotionally heavy
  ['Why do I feel sad without knowing the reason?', 'sad-no-reason'],
  ['Can I just talk about what I’m feeling?', 'just-talk'],
  ['How do I let go of something that’s been hurting me?', 'old-hurt'],
  ['Why am I still hurt by something that happened a long time ago?', 'old-hurt'],
  ['How do I stop pretending that I’m okay?', 'pretending-okay'],
  ['What should I do when I feel emotionally drained?', 'emotionally-drained'],
  ['How can I be kinder to myself when I’m not doing well?', 'self-kindness'],
  ['Why do I feel lonely even when I’m surrounded by people?', 'lonely'],
  ['Can you help me process what happened today?', 'process-today'],
  ['How do I accept feelings that I don’t understand?', 'accept-feelings'],
  // Can't sleep
  ['Can you help me fall asleep tonight?', 'sleep-tonight'],
  ['Why does my mind become so active when I lie down?', 'active-mind-night'],
  ['Can you guide me through a bedtime meditation?', 'bedtime-meditation'],
  ['How do I stop replaying conversations in my head?', 'replaying'],
  ['Can you tell me a calming story before I sleep?', 'bedtime-story'],
  ['What can I do when I feel tired but can’t sleep?', 'tired-cant-sleep'],
  ['Can you help me release the thoughts I’ve been carrying today?', 'release-thoughts'],
  ['Can you guide me through a body relaxation exercise?', 'body-relaxation'],
  ['How do I stop worrying about tomorrow?', 'worry-tomorrow'],
  ['Can we do a quiet 10-minute meditation together?', 'bedtime-meditation'],
  // Anxious about the future
  ['What if things don’t go the way I planned?', 'plans-fail'],
  ['How can I stop being afraid of the unknown?', 'uncertainty'],
  ['Why am I always worrying about what will happen next?', 'present-moment'],
  ['How do I focus on the present instead of the future?', 'present-moment'],
  ['What can I remind myself of when I feel uncertain?', 'uncertainty'],
  ['How do I deal with the fear of failing?', 'fear-failing'],
  ['Can you help me feel more grounded right now?', 'grounded'],
  ['How do I stop comparing my progress to other people’s?', 'comparison'],
  ['What if I’m not where I’m supposed to be in life?', 'behind-in-life'],
  ['Can you help me take things one day at a time?', 'one-day'],
  // Self-esteem
  ['How can I learn to appreciate myself more?', 'appreciate-self'],
  ['Why do I keep doubting my abilities?', 'self-doubt'],
  ['How do I stop being so hard on myself?', 'hard-on-self'],
  ['Can you help me recognize my strengths?', 'strengths'],
  ['How do I stop comparing myself to others?', 'comparison'],
  ['What should I do when I feel like I’m not good enough?', 'not-good-enough'],
  ['How can I become more confident without pretending?', 'confidence'],
  ['How do I forgive myself for my mistakes?', 'forgive-self'],
  ['Can you help me create a healthier relationship with myself?', 'appreciate-self'],
  ['What are some things I should remind myself of today?', 'reminders-today'],
  // Relationships
  ['How do I let go of someone I still care about?', 'let-go-person'],
  ['How do I cope with missing someone?', 'missing-someone'],
  ['Why do I keep thinking about what someone said to me?', 'replaying'],
  ['How can I stop seeking validation from others?', 'validation'],
  ['How do I set boundaries without feeling guilty?', 'boundaries'],
  ['How can I forgive someone without forgetting what happened?', 'forgive-other'],
  ['How do I deal with the feeling of being misunderstood?', 'misunderstood'],
  ['What can I do when a relationship feels emotionally exhausting?', 'draining-relationship'],
  ['How do I stop expecting people to understand everything I’m feeling?', 'misunderstood'],
  ['How do I find peace with things I cannot change about a relationship?', 'peace-relationship'],
  // Understanding myself
  ['Why do I feel the way I feel today?', 'feel-today'],
  ['What emotions have I been ignoring lately?', 'feel-today'],
  ['What do I actually need right now?', 'what-i-need'],
  ['What has been taking up most of my mental energy?', 'holding-on'],
  ['What am I holding onto that I should release?', 'holding-on'],
  ['What does feeling at peace mean to me?', 'peace-meaning'],
  ['What are the things I should be grateful for today?', 'gratitude'],
  ['How can I become more aware of my thoughts?', 'thought-awareness'],
  ['What habits are making it harder for me to feel at peace?', 'peace-habits'],
  ['Can you ask me questions to help me understand myself better?', 'ask-me-questions'],
  // Healthy habits
  ['How can I make meditation a daily habit?', 'daily-habit'],
  ['How do I stay consistent when I lose motivation?', 'consistency'],
  ['Can you help me build a simple morning routine?', 'morning-routine'],
  ['What is a good meditation routine for beginners?', 'beginner-routine'],
  ['How do I make time for myself without feeling guilty?', 'me-time'],
  ['Can you create a 7-day mindfulness challenge?', 'challenge-7day'],
  ['How can I become more intentional with my time?', 'intentional-time'],
  ['How do I create a peaceful start to my day?', 'morning-routine'],
  ['What small habits can help me feel less stressed?', 'small-habits'],
  ['Can you help me build a nighttime routine?', 'night-routine'],
];

/** The same needs, typed the way people really type: no question mark, typos, shorthand, a word or two. */
const AS_TYPED: [string, string][] = [
  ['overthinking', 'overthinking'],
  ['cant stop overthnking', 'overthinking'],
  ['im so overwelmed', 'overwhelmed'],
  ['everything at once', 'overwhelmed'],
  ['calm me down pls', 'calm-now'],
  ['breathing exercise', 'breathing-exercise'],
  ['burnout', 'pressure-burnout'],
  ['so much pressure at work', 'pressure-burnout'],
  ['mentaly exhausted', 'mental-exhaustion'],
  ['sad for no reason', 'sad-no-reason'],
  ['i feel sad', 'sad-no-reason'],
  ['lonly', 'lonely'],
  ['i feel so alone', 'lonely'],
  ['just want to vent', 'just-talk'],
  ['pretending im ok', 'pretending-okay'],
  ['emotionaly drained', 'emotionally-drained'],
  ['cnt slep', 'sleep-tonight'],
  ['i cant sleep tonite', 'sleep-tonight'],
  ['insomnia', 'sleep-tonight'],
  ['hindi makatulog', 'sleep-tonight'],
  ['mind racing when i lie down', 'active-mind-night'],
  ['bedtime story', 'bedtime-story'],
  ['tell me a story', 'bedtime-story'],
  ['tired but cant sleep', 'tired-cant-sleep'],
  ['relax my body', 'body-relaxation'],
  ['worried about tmrw', 'worry-tomorrow'],
  ['big exam tomorrow', 'worry-tomorrow'],
  ['fear of failure', 'fear-failing'],
  ['afraid of the unknown', 'uncertainty'],
  ['comparing myself to others', 'comparison'],
  ['falling behind in life', 'behind-in-life'],
  ['day by day', 'one-day'],
  ['self doubt', 'self-doubt'],
  ['too hard on myslef', 'hard-on-self'],
  ['not good enough', 'not-good-enough'],
  ['confidence', 'confidence'],
  ['forgive myself', 'forgive-self'],
  ['affirmations', 'reminders-today'],
  ['breakup', 'let-go-person'],
  ['i miss him', 'missing-someone'],
  ['people pleaser', 'validation'],
  ['how to say no', 'boundaries'],
  ['forgiveness', 'forgive-other'],
  ['nobody understands me', 'misunderstood'],
  ['toxic relationship', 'draining-relationship'],
  ['what do i need', 'what-i-need'],
  ['gratitude', 'gratitude'],
  ['journaling', 'ask-me-questions'],
  ['doomscrolling', 'peace-habits'],
  ['daily habit', 'daily-habit'],
  ['no motivation', 'consistency'],
  ['morning routine', 'morning-routine'],
  ['new to meditation', 'beginner-routine'],
  ['7 day challenge', 'challenge-7day'],
  ['procrastination', 'intentional-time'],
  ['night routine', 'night-routine'],
  ['rain sounds', 'sounds'],
  ['play something relaxing', 'sounds'],
  ['yoga for my back', 'yoga'],
  ['stretching', 'yoga'],
  ['my boss is so annoying', 'pressure-burnout'],
  ['my gf left me', 'let-go-person'],
  ['nobody loves me', 'lonely'],
  ['i tried meditating but it didnt work', 'beginner-routine'],
  ['my heart is racing', 'calm-now'],
];

describe('Kapwa’s prepared answers', () => {
  it.each(QUESTIONS)('answers “%s” with %s', (question, topic) => {
    const reply = replyTo(question);
    expect(reply.intentId).toBe(topic);
    expect(reply.prepared).toBe(true);
  });

  it.each(AS_TYPED)('understands “%s” as %s', (typed, topic) => {
    expect(replyTo(typed).intentId).toBe(topic);
  });

  it('answers every topic somewhere in the list', () => {
    const covered = new Set([...QUESTIONS, ...AS_TYPED].map(([, topic]) => topic));
    for (const topic of kapwaTopics) expect(covered.has(topic.id), topic.id).toBe(true);
  });

  it('suggests at least two kinds of thing for each topic', () => {
    for (const topic of kapwaTopics) {
      const kinds = new Set((topic.actions ?? []).map((action) => action.type));
      expect(kinds.size, topic.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('offers follow-up questions it understands itself', () => {
    for (const intent of kapwaIntents) {
      for (const suggestion of intent.suggestions ?? []) {
        const reply = replyTo(suggestion);
        expect(reply.intentId, `${intent.id}: ${suggestion}`).not.toBe('fallback');
        expect(reply.prepared, `${intent.id}: ${suggestion}`).toBe(true);
      }
    }
  });

  it('answers every opener with a prepared answer', () => {
    for (const quick of kapwaQuickReplies) expect(replyTo(quick).prepared, quick).toBe(true);
  });

  it('keeps safety ahead of every topic', () => {
    expect(replyTo('I’m overwhelmed and I want to die').intentId).toBe('crisis');
    expect(replyTo('cant sleep and I keep thinking about ending my life').intentId).toBe('crisis');
    expect(replyTo('I feel lonely and I want to hurt myself').intentId).toBe('crisis');
  });

  it('leaves a long story to the AI', () => {
    const story = `${'and then he went and then she went '.repeat(4)}and I feel lonely`;
    expect(story.split(' ').length).toBeGreaterThan(PREPARED_MAX_WORDS);
    const reply = replyTo(story);
    expect(reply.intentId).toBe('lonely');
    expect(reply.prepared).toBeUndefined();
  });
});

describe('matching what people type', () => {
  it('reads chat shorthand', () => {
    expect(matchWords('idk y im like this rn')).toEqual(
      ['i', 'dont', 'know', 'why', 'i', 'am', 'like', 'this', 'right', 'now'],
    );
    expect(matchWords('I can’t sleep')).toEqual(['i', 'cant', 'sleep']);
  });

  it('forgives small typos in longer words', () => {
    expect(keywordScore(matchWords('anxios'), 'anxious')).toBeGreaterThan(0);
    expect(keywordScore(matchWords('overwhlemed'), 'overwhelmed')).toBeGreaterThan(0);
    expect(keywordScore(matchWords('sleping'), 'sleep')).toBeGreaterThan(0);
  });

  it('takes endings as written', () => {
    expect(keywordScore(matchWords('overthinking'), 'overthink')).toBe(1);
  });

  it('counts a near miss for less than an exact word', () => {
    expect(keywordScore(matchWords('lonly'), 'lonely')).toBeLessThan(keywordScore(matchWords('lonely'), 'lonely'));
  });

  it('does not read real words as typos', () => {
    expect(keywordScore(matchWords('I tried'), 'tired')).toBe(0);
    expect(keywordScore(matchWords('counting sheep'), 'sleep')).toBe(0);
    expect(keywordScore(matchWords('so lovely'), 'lonely')).toBe(0);
    // Short words are never guessed at: "sad" is not "bad", "mad" or "said".
    expect(keywordScore(matchWords('that was bad'), 'sad')).toBe(0);
  });

  it('needs a phrase’s words together and in order', () => {
    expect(keywordScore(matchWords('fall asleep'), 'fall asleep')).toBe(2);
    expect(keywordScore(matchWords('asleep in the fall'), 'fall asleep')).toBe(0);
  });
});

describe('what the topics point to', () => {
  const content = JSON.parse(
    readFileSync(fileURLToPath(new URL('../content/content.json', import.meta.url)), 'utf8'),
  ) as { meditations: { id: string }[]; yoga: { id: string }[]; stories: { id: string }[]; programs: { id: string }[] };
  const ids = (list: { id: string }[]) => new Set(list.map((item) => item.id));
  const meditations = ids(content.meditations);
  const yoga = ids(content.yoga);
  const stories = ids(content.stories);
  const programs = ids(content.programs);

  it('exists in the content', () => {
    for (const intent of kapwaIntents) {
      for (const action of intent.actions ?? []) {
        const where = `${intent.id}: ${JSON.stringify(action)}`;
        if (action.type === 'session') expect(meditations.has(action.id), where).toBe(true);
        if (action.type === 'yoga') expect(yoga.has(action.id), where).toBe(true);
        if (action.type === 'story') expect(stories.has(action.id), where).toBe(true);
        if (action.type === 'sound') expect(action.id in soundscapes, where).toBe(true);
        if (action.type === 'page' && action.href.startsWith('/programs/')) {
          expect(programs.has(action.href.slice('/programs/'.length)), where).toBe(true);
        }
      }
    }
  });
});
