import {
  crisisReply,
  kapwaFallback,
  kapwaIntents,
  kapwaQuickReplies,
  medicalUrgentReply,
  type KapwaAction,
  type KapwaReply,
} from '@/data/kapwa';
import { practices, type Practice } from '@/data/kapwa-knowledge';
import { canRun } from '@/lib/kapwa-runner';
import {
  PERSONAL_PREFIX,
  personalReply,
  readGivenName,
  withoutActivity,
  type KapwaProfile,
  type PersonalConsent,
  type ProfileEffects,
} from '@/lib/kapwa-profile';
import { kapwaTopics } from '@/data/kapwa-topics';
import { answer, matchWords, rankIntents, safetyKind, safetyReplyIn, type RankedIntent } from '@/lib/kapwa';
import { currentLanguage, replyPhrasesIn, sourceOf, speaking, t, type KapwaLanguage } from '@/lib/kapwa-i18n';
import {
  enrichReply,
  getPractice,
  LENGTH_INTENT,
  PRACTICE_PREFIX,
  practiceText,
  suggestSessions,
} from '@/lib/kapwa-knowledge';

/**
 * Kapwa's dialogue manager: a small state machine over the intent engine
 * (lib/kapwa) and the knowledge base (lib/kapwa-knowledge).
 *
 * Each of Kapwa's replies carries a `DialogueMemory`: the state the
 * conversation is in, and the topic and practice it is about. The next
 * message is read against it, so a short answer means something:
 *
 *   Kapwa: …Would you like to try the double sigh together now?   (offering)
 *   You:   yes                       → the practice, step by step  (exercise)
 *   You:   a bit better              → glad, and what next         (follow-up)
 *   You:   that's enough for now     → a warm close                (closing)
 *
 * States: greeting, understanding (a need was answered), clarifying (Kapwa
 * asked which of two things was meant), offering (a practice was offered),
 * exercise (a practice was taught), follow-up (after it helped), closing,
 * fallback, safety.
 *
 * Also here: asking instead of guessing when a match is weak or two topics
 * fit equally, a different reply when a topic comes up again, and varied
 * wording for everything Kapwa says around the answers.
 *
 * The memory is plain data about the conversation on this phone. It holds no
 * diagnosis or profile, and clearing the chat clears it.
 */

export type DialogueState =
  | 'greeting'
  | 'understanding'
  | 'clarifying'
  | 'offering'
  | 'exercise'
  | 'follow-up'
  | 'closing'
  | 'fallback'
  | 'safety';

export interface DialogueMemory {
  state: DialogueState;
  /** The intent behind the reply. */
  intentId: string;
  topicId?: string;
  /** The practice offered or being done. */
  practiceId?: string;
  /** While clarifying: the intents offered, best first. */
  options?: string[];
  /** Practices in a row that didn't help, to know when to say more. */
  misses?: number;
}

export interface DialogueTurn extends KapwaReply {
  memory: DialogueMemory;
  /** One short question after the answer, shown as its own message. */
  followUp?: string;
  /** What the chat should change: the reader's consent, or the name they gave. */
  effects?: ProfileEffects;
}

export interface DialogueContext {
  /** The memory on Kapwa's last reply, if there is one. */
  last?: DialogueMemory;
  /** Intents Kapwa has answered earlier in this chat, oldest first. */
  earlier?: string[];
  turn?: number;
  supportTrack?: boolean;
  /** The reader's own data on this phone, for questions about themself. */
  profile?: KapwaProfile;
  /** Whether they let Kapwa use their activity; undefined until asked. */
  personal?: PersonalConsent;
  /** The language to reply in; English when absent. Messages are understood in any of them. */
  lang?: KapwaLanguage;
}

// ─── Wording ────────────────────────────────────────────────────────────────

/** One of several wordings, taken in turn, so nothing is said the same way twice in a row. */
function pick(variants: string[], turn: number): string {
  return variants[Math.abs(turn) % variants.length];
}

const YES = 'Yes, let’s try it';
const NOT_NOW = 'Not right now';
const FELT_BETTER = 'I feel a bit better';
const DIDNT_HELP = 'It didn’t help';
const ANOTHER = 'Show me another one';
const SHORT_MEDITATION = 'Yes, a short meditation';
const ENOUGH = 'That’s enough for now';
const TALK = 'I’d like to talk';
const LISTEN = 'Something calming to listen to';

/** A practice's name inside a sentence: "box breathing", or its translation. */
const named = (practice: Practice) => ({
  practice: currentLanguage() === 'en' ? lower(practice.title) : t(practice.title),
  minutes: practice.minutes,
});

/**
 * Everything Kapwa says around its answers. Written in English; a reply is
 * put into the reader's language as it leaves `converse`, and lines with
 * blanks are translated where they are filled in.
 */
const lines = {
  offerPractice: (practice: Practice) => [
    t('Would you like to try {practice} together now? It takes about {minutes} min.', named(practice)),
    t('Shall we try {practice} right here? It’s about {minutes} min.', named(practice)),
    t('If you’d like, we can do {practice} together now. About {minutes} min. Shall we?', named(practice)),
  ],
  afterPractice: [
    'Take your time with it. When you’ve finished, tell me how you feel.',
    'Go at your own pace. Afterwards, let me know how it went.',
    'There’s no rush. When you’re done, tell me how you’re feeling.',
  ],
  afterJournal: [
    'Write as much or as little as you like. When you’re ready, tell me how it felt.',
    'Take your time. Afterwards, let me know what came up, if you’d like to.',
  ],
  better: [
    'I’m really glad that helped a little. Small shifts like that are worth noticing.',
    'That’s good to hear. Even a little lighter is something.',
    'I’m glad. Notice that feeling; you made it happen.',
  ],
  keepGoing: [
    'Would you like a short guided meditation to keep this going, or is that enough for now?',
    'Would you like to carry on with a short meditation, or leave it there for now?',
  ],
  didntHelp: [
    'Thank you for telling me. Not every practice suits every moment, and that’s okay.',
    'That’s okay. Some practices fit one day and not another.',
    'Thanks for being honest. It doesn’t mean you did anything wrong.',
  ],
  stillHard: [
    'It sounds like this is really hard right now. If you’ve been feeling this way for a while, talking to someone you trust or a professional can make a real difference. In the meantime, here’s something gentler to try.',
  ],
  tryInstead: (practice: Practice) => [
    t('Would you like to try {practice} instead? It’s about {minutes} min.', named(practice)),
    t('Shall we try {practice} instead? About {minutes} min.', named(practice)),
  ],
  howDoYouFeel: [
    'Well done for taking that time. How do you feel now, compared with before?',
    'Thank you for doing that. How are you feeling now?',
  ],
  notNow: [
    'That’s okay. There’s no right way to do this. Would you rather talk about what’s going on, or have something calming to listen to?',
    'Of course. We can go at your pace. Would it help more to talk it through, or to have something soothing to listen to?',
  ],
  closing: [
    'Take that calm with you. I’m here whenever you need a moment.',
    'Thank you for taking this time for yourself. Come back whenever you like.',
    'Go gently. I’m here any time you want to pause again.',
  ],
  whatHelp: [
    'What would you like help with? You can tell me in a few words, or pick one of these.',
    'What’s on your mind? A few words is enough, or tap one of these.',
  ],
  noProblem: [
    'That’s okay. I’m here if anything comes up.',
    'No problem. I’ll be here whenever you need me.',
  ],
  gladAnyway: [
    'I’m glad to hear that. Is there anything you’d like to do, or just enjoy feeling a little lighter?',
  ],
  hardNow: [
    'I’m sorry it’s hard right now. Would you like to tell me a little about what’s going on? A few words is enough.',
    'That sounds difficult. If you’d like, tell me a bit about it, in your own words.',
  ],
  // Neutral on purpose: if a negation was misread, this mustn't sound dismissive.
  notWeighing: [
    'Thanks for telling me. Is there something else on your mind today?',
    'Okay. What would you like help with? A few words is enough, or pick one of these.',
  ],
  tellMeMore: [
    'No problem. Could you tell me a little more, in your own words? Or pick one of these.',
    'Okay. What would describe it better? A few words is fine.',
  ],
  didYouMean: (label: string) => [
    t('Just to check I understood: did you mean “{label}”?', { label: t(label) }),
    t('Did you mean “{label}”?', { label: t(label) }),
  ],
  whichOne: [
    'I can help with either of these. Which is closer to how you feel?',
    'I want to get this right for you. Which of these fits better?',
  ],
  stillUnclear: [
    'Sorry, I still didn’t catch that. Could you put it another way, in a few simple words? Or pick one of these.',
    'I’m still not following, and that’s on me, not you. Try one or two words about how you feel, like “stressed” or “can’t sleep”.',
  ],
  again: [
    'We touched on this earlier, so here it is again, with something different to try this time.',
    'This came up before. Here’s the same guidance, and a different practice to try.',
  ],
};

const lower = (title: string) => (title.startsWith('The ') ? `the ${title.slice(4)}` : title.charAt(0).toLowerCase() + title.slice(1));

// ─── What a short reply means ───────────────────────────────────────────────

export type ReplyKind = 'yes' | 'no' | 'better' | 'worse' | 'another' | 'shorter' | 'longer' | 'done' | 'enough';

/**
 * Short replies that only make sense in context. Earlier kinds win a tie, and
 * a longer phrase beats a shorter one, so "not better" is worse, not better,
 * and "yes it helped" is better, not just yes.
 */
export const REPLY_PHRASES: [ReplyKind, string[]][] = [
  ['worse', [
    'not better', 'no better', 'didnt help', 'did not help', 'doesnt help', 'not helping', 'didnt work', 'did not work',
    'the same', 'about the same', 'still', 'worse', 'no change', 'nothing changed', 'not much', 'not working',
  ]],
  ['enough', [
    'thats enough', 'enough for now', 'that is enough', 'im good', 'i am good', 'all good', 'no more', 'stop here',
    'leave it there', 'thats all', 'that is all',
  ]],
  ['better', [
    'better', 'a bit better', 'bit better', 'little better', 'calmer', 'calm now', 'helped', 'that helped', 'it helped',
    'relaxed', 'more relaxed', 'good', 'great', 'nice', 'lighter', 'much better', 'feel better', 'okay now', 'ok now',
    'it worked', 'that worked', 'ayos', 'gumaan',
  ]],
  ['another', [
    'another', 'another one', 'something else', 'different one', 'something different', 'other one', 'next one',
    'one more', 'try another', 'show me another', 'a different one', 'other options',
  ]],
  ['shorter', ['shorter', 'too long', 'quicker', 'less time', 'shorter one']],
  ['longer', ['longer', 'too short', 'more time', 'longer one']],
  ['done', ['done', 'finished', 'i did it', 'did it', 'completed', 'i tried it', 'tried it', 'all done']],
  ['yes', [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'please', 'lets do it', 'lets try', 'lets go', 'go ahead',
    'why not', 'of course', 'oo', 'sige', 'opo', 'alright', 'yes please', 'sounds good', 'lets', 'i would like that',
  ]],
  ['no', [
    'no', 'nope', 'nah', 'not now', 'not right now', 'maybe later', 'later', 'no thanks', 'no thank you', 'hindi',
    'ayoko', 'not really', 'rather not', 'not it', 'thats not it',
  ]],
];

/** The same kinds of short reply in Filipino and Hindi ("oo", "haan", "theek hai"), added to the English. */
const ALL_REPLY_PHRASES: [ReplyKind, string[]][] = REPLY_PHRASES.map(([kind, phrases]) => [kind, [...phrases, ...replyPhrasesIn(kind)]]);

/** Longer than this, a message says more than a short reply does. */
const SHORT_REPLY_WORDS = 8;

/** What a short reply means, with its strength (words matched), or null. */
export function readReply(message: string): { kind: ReplyKind; score: number } | null {
  const words = matchWords(message);
  if (words.length === 0 || words.length > SHORT_REPLY_WORDS) return null;
  let best: { kind: ReplyKind; score: number } | null = null;
  for (const [kind, phrases] of ALL_REPLY_PHRASES) {
    for (const phrase of phrases) {
      // Exact words only: "good" mustn't be read into "goodbye", nor "ok" into "okra".
      const parts = matchWords(phrase);
      const found = words.some((_, start) => parts.every((part, i) => words[start + i] === part));
      if (found && (!best || parts.length > best.score)) best = { kind, score: parts.length };
    }
  }
  return best;
}

/** States in which Kapwa has just asked something, so a short reply is most likely its answer. */
const AWAITING: DialogueState[] = ['offering', 'exercise', 'follow-up', 'clarifying'];

// ─── Labels for asking which was meant ──────────────────────────────────────

/**
 * How each topic is offered when Kapwa asks which was meant. Each one, sent
 * back, is understood as that topic (a test checks).
 */
export const TOPIC_LABELS: Record<string, string> = {
  overwhelmed: 'I feel overwhelmed',
  'calm-now': 'Help me calm down right now',
  overthinking: 'I can’t stop overthinking',
  'mental-exhaustion': 'I’m mentally exhausted',
  'worry-control': 'I worry about things I can’t control',
  'breathing-exercise': 'Guide me through a breathing exercise',
  'pressure-burnout': 'I’m under a lot of pressure',
  'fix-everything': 'I feel I need to fix everything',
  'clear-mind': 'I need to clear my mind',
  'sad-no-reason': 'I feel sad',
  'just-talk': 'I just want to talk',
  'old-hurt': 'Something from the past still hurts',
  'pretending-okay': 'I’m pretending to be okay',
  'emotionally-drained': 'I feel emotionally drained',
  'self-kindness': 'Help me be kinder to myself',
  lonely: 'I feel lonely',
  'process-today': 'Help me process my day',
  'accept-feelings': 'I don’t understand my feelings',
  'sleep-tonight': 'I can’t sleep',
  'active-mind-night': 'My mind races when I lie down',
  'bedtime-meditation': 'A bedtime meditation',
  replaying: 'I keep replaying conversations',
  'bedtime-story': 'Tell me a bedtime story',
  'tired-cant-sleep': 'I’m tired but can’t sleep',
  'release-thoughts': 'Help me release today’s thoughts',
  'body-relaxation': 'Help me relax my body',
  'worry-tomorrow': 'I’m worried about tomorrow',
  'plans-fail': 'What if things don’t go as planned?',
  uncertainty: 'I’m afraid of the unknown',
  'present-moment': 'Help me focus on the present',
  'fear-failing': 'I’m afraid of failing',
  grounded: 'Help me feel grounded',
  comparison: 'I keep comparing myself to others',
  'behind-in-life': 'I feel behind in life',
  'one-day': 'Help me take one day at a time',
  'appreciate-self': 'Help me appreciate myself',
  'self-doubt': 'I keep doubting myself',
  'hard-on-self': 'I’m too hard on myself',
  strengths: 'Help me find my strengths',
  'not-good-enough': 'I feel not good enough',
  confidence: 'I want to feel more confident',
  'forgive-self': 'I can’t forgive myself',
  'reminders-today': 'Tell me something nice',
  'let-go-person': 'I need to let go of someone',
  'missing-someone': 'I miss someone',
  validation: 'I keep seeking validation',
  boundaries: 'I struggle to set boundaries',
  'forgive-other': 'I want to forgive someone',
  misunderstood: 'I feel misunderstood',
  'draining-relationship': 'A relationship is draining me',
  'peace-relationship': 'I need peace with what I can’t change',
  'feel-today': 'Why do I feel the way I feel today?',
  'what-i-need': 'What do I need right now?',
  'holding-on': 'What am I holding onto?',
  'peace-meaning': 'What does peace mean to me?',
  gratitude: 'What can I be grateful for?',
  'thought-awareness': 'I want to be more aware of my thoughts',
  'peace-habits': 'Bad habits are making it harder',
  'ask-me-questions': 'Ask me questions to understand myself',
  'daily-habit': 'Help me meditate every day',
  consistency: 'I lose motivation',
  'morning-routine': 'Help me build a morning routine',
  'beginner-routine': 'I’m new to meditation',
  'me-time': 'I need time for myself',
  'challenge-7day': 'Give me a 7-day challenge',
  'intentional-time': 'I want to be intentional with my time',
  'small-habits': 'Small habits for less stress',
  'night-routine': 'Help me build a night routine',
  sounds: 'Calming sounds',
  yoga: 'Gentle yoga',
};

function labelFor(intentId: string): string | undefined {
  if (intentId.startsWith(PRACTICE_PREFIX)) return getPractice(intentId.slice(PRACTICE_PREFIX.length))?.title;
  return TOPIC_LABELS[intentId];
}

const topicIds = new Set(kapwaTopics.map((topic) => topic.id));
const isTopic = (intentId: string) => topicIds.has(intentId);

// ─── Practices for a topic ──────────────────────────────────────────────────

/** The practices that fit a topic, best first. */
export function practicesFor(topicId: string): Practice[] {
  return practices.filter((practice) => practice.intents.includes(topicId));
}

/**
 * A practice to try next, different from what was just done: another for
 * the same topic, else another of the same kind, else a breathing practice.
 * With `otherKind`, one of a different kind, for when this kind isn't working.
 */
function nextPractice(current: Practice | undefined, topicId: string | undefined, otherKind = false): Practice | undefined {
  const skip = (practice: Practice) =>
    practice.id === current?.id || practice.kind === 'education' || (otherKind && practice.kind === current?.kind);
  const forTopic = topicId ? practicesFor(topicId).filter((practice) => !skip(practice)) : [];
  if (forTopic.length) return forTopic[0];
  const pool = practices.filter((practice) => !skip(practice) && (otherKind || practice.kind === current?.kind));
  if (pool.length && current) {
    // The one after the current, in library order, so "another" keeps moving.
    const after = pool.find((practice) => practices.indexOf(practice) > practices.indexOf(current));
    return after ?? pool[0];
  }
  return pool[0] ?? practices.find((practice) => practice.kind === 'breathing' && practice.id !== current?.id);
}

/** A shorter practice than `current`, of its kind if possible. */
function shorterPractice(current: Practice): Practice | undefined {
  const shorter = practices.filter((practice) => practice.minutes < current.minutes && practice.kind !== 'education');
  return shorter.find((practice) => practice.kind === current.kind) ?? shorter.sort((a, b) => a.minutes - b.minutes)[0];
}

// ─── Building turns ─────────────────────────────────────────────────────────

const practiceAction = (practice: Practice): KapwaAction => ({ type: 'practice', id: practice.id });

/** A practice's buttons, led by "Start" when it can be guided in time. */
function withRun(practice: Practice, actions: KapwaAction[]): KapwaAction[] {
  return canRun(practice) ? [{ type: 'run', id: practice.id }, ...actions] : actions;
}

/** Teaching a practice in the chat, with the question that follows it. */
function teach(practice: Practice, message: string, turn: number, memory: Partial<DialogueMemory> = {}): DialogueTurn {
  const reply = enrichReply(
    {
      intentId: `${PRACTICE_PREFIX}${practice.id}`,
      text: practiceText(practice),
      actions: practice.related,
      prepared: true,
    },
    message,
  );
  const education = practice.kind === 'education';
  return {
    ...reply,
    actions: withRun(practice, reply.actions),
    followUp: education ? undefined : pick(practice.kind === 'journaling' ? lines.afterJournal : lines.afterPractice, turn),
    suggestions: education ? undefined : [FELT_BETTER, DIDNT_HELP, ANOTHER],
    memory: {
      state: education ? 'understanding' : 'exercise',
      intentId: reply.intentId,
      practiceId: practice.id,
      ...memory,
    },
  };
}

/** A short turn of Kapwa's own words, with buttons and suggestions. */
function say(
  text: string,
  memory: DialogueMemory,
  { actions = [], suggestions }: { actions?: KapwaAction[]; suggestions?: string[] } = {},
): DialogueTurn {
  return { intentId: memory.intentId, text, actions, suggestions, prepared: true, memory };
}

/** Offering a different practice after one didn't help. */
function offerInstead(current: Practice | undefined, last: DialogueMemory, turn: number): DialogueTurn {
  const misses = (last.misses ?? 0) + 1;
  // After two misses, try a different kind of practice and say more.
  const alternative = nextPractice(current, last.topicId, misses >= 2);
  const opening = misses >= 2 ? lines.stillHard[0] : pick(lines.didntHelp, turn);
  if (!alternative) {
    return say(opening, { state: 'understanding', intentId: 'didnt-help', topicId: last.topicId, misses }, { suggestions: kapwaQuickReplies });
  }
  const sounds: KapwaAction[] = misses >= 2 ? [{ type: 'sound', id: 'rain' }, { type: 'page', href: '/help', label: 'Help' }] : [];
  return {
    ...say(opening, { state: 'offering', intentId: 'didnt-help', topicId: last.topicId, practiceId: alternative.id, misses }, {
      actions: [practiceAction(alternative), ...sounds],
      suggestions: [YES, NOT_NOW],
    }),
    followUp: pick(lines.tryInstead(alternative), turn),
  };
}

/** Meditations for a length, as the length intent answers them. */
function sessionsFor(message: string, fallbackMessage: string, memory: DialogueMemory): DialogueTurn {
  const reply = enrichReply({ intentId: LENGTH_INTENT, text: '', actions: [], prepared: true }, message || fallbackMessage);
  return { ...reply, memory };
}

function closing(turn: number, last?: DialogueMemory): DialogueTurn {
  return say(pick(lines.closing, turn), { state: 'closing', intentId: 'closing', topicId: last?.topicId }, { suggestions: kapwaQuickReplies });
}

/**
 * A short reply read against what Kapwa last said. Null when it doesn't fit
 * the moment, and the message is answered on its own instead.
 */
function inContext(kind: ReplyKind, message: string, last: DialogueMemory | undefined, turn: number): DialogueTurn | null {
  const practice = last?.practiceId ? getPractice(last.practiceId) : undefined;
  const state = last?.state;

  if (kind === 'enough') return closing(turn, last);

  if (kind === 'shorter' || kind === 'longer') {
    if (kind === 'shorter' && practice && state === 'exercise') {
      const shorter = shorterPractice(practice);
      if (shorter) return teach(shorter, message, turn, { topicId: last?.topicId });
    }
    return sessionsFor(kind === 'shorter' ? 'a short meditation' : 'a long meditation', '', {
      state: 'offering',
      intentId: LENGTH_INTENT,
      topicId: last?.topicId,
    });
  }

  if (state === 'clarifying' && last?.options?.length) {
    if (kind === 'yes') return null; // Answered by the caller, from the option.
    if (kind === 'no') {
      return say(pick(lines.tellMeMore, turn), { state: 'understanding', intentId: 'clarify-no' }, { suggestions: kapwaQuickReplies });
    }
  }

  if (state === 'offering') {
    if (kind === 'yes' && practice) return teach(practice, message, turn, { topicId: last?.topicId, misses: last?.misses });
    if (kind === 'another') {
      const next = nextPractice(practice, last?.topicId);
      if (next) return teach(next, message, turn, { topicId: last?.topicId });
    }
    if (kind === 'no') {
      return say(pick(lines.notNow, turn), { state: 'clarifying', intentId: 'not-now', topicId: last?.topicId, options: ['just-talk', 'sounds'] }, {
        suggestions: [TALK, LISTEN],
      });
    }
    if (kind === 'worse') return offerInstead(practice, last!, turn);
    if (kind === 'better' || kind === 'done') return closing(turn, last);
  }

  if (state === 'exercise') {
    if (kind === 'better') {
      const [session] = suggestSessions({ categories: practice?.appCategories, minutes: 5, count: 1 });
      return {
        ...say(pick(lines.better, turn), { state: 'follow-up', intentId: 'felt-better', topicId: last?.topicId, practiceId: practice?.id }, {
          actions: session ? [{ type: 'session', id: session.id }] : [],
          suggestions: [SHORT_MEDITATION, ENOUGH],
        }),
        followUp: pick(lines.keepGoing, turn),
      };
    }
    if (kind === 'worse' || kind === 'no') return offerInstead(practice, last!, turn);
    if (kind === 'done' || kind === 'yes') {
      return say(pick(lines.howDoYouFeel, turn), { ...last!, intentId: 'how-was-it' }, { suggestions: ['Calmer', 'About the same', 'Worse'] });
    }
    if (kind === 'another') {
      const next = nextPractice(practice, last?.topicId);
      if (next) return teach(next, message, turn, { topicId: last?.topicId });
    }
  }

  if (state === 'follow-up') {
    if (kind === 'yes') {
      return sessionsFor('a short meditation', '', { state: 'closing', intentId: LENGTH_INTENT, topicId: last?.topicId });
    }
    if (kind === 'no' || kind === 'done') return closing(turn, last);
    if (kind === 'another' && practice) {
      const next = nextPractice(practice, last?.topicId);
      if (next) return teach(next, message, turn, { topicId: last?.topicId });
    }
  }

  // No fitting context: the short reply on its own.
  if (kind === 'yes') return say(pick(lines.whatHelp, turn), { state: 'understanding', intentId: 'what-help' }, { suggestions: kapwaQuickReplies });
  if (kind === 'no') return say(pick(lines.noProblem, turn), { state: 'closing', intentId: 'no-problem' }, { suggestions: kapwaQuickReplies });
  if (kind === 'better') return say(lines.gladAnyway[0], { state: 'understanding', intentId: 'glad' }, { suggestions: kapwaQuickReplies });
  if (kind === 'worse') return say(pick(lines.hardNow, turn), { state: 'understanding', intentId: 'hard-now' }, { suggestions: kapwaQuickReplies });
  if (kind === 'another' && practice) {
    const next = nextPractice(practice, last?.topicId);
    if (next) return teach(next, message, turn, { topicId: last?.topicId });
  }
  if (kind === 'another') {
    // Nothing practice-related in play: something different to try, for the
    // topic if there is one, else a calm breathing practice.
    const next = (last?.topicId && practicesFor(last.topicId)[0]) || nextPractice(undefined, last?.topicId);
    if (next) return teach(next, message, turn, { topicId: last?.topicId });
  }
  if (kind === 'done') {
    return say(pick(lines.howDoYouFeel, turn), { state: 'exercise', intentId: 'how-was-it', topicId: last?.topicId }, {
      suggestions: ['Calmer', 'About the same', 'Worse'],
    });
  }
  return null;
}

/** Decorates a plain answer with the state it leaves the conversation in, and the one question that follows. */
function withState(reply: KapwaReply, ranked: RankedIntent | undefined, context: DialogueContext, turn: number): DialogueTurn {
  const intentId = reply.intentId;
  const repeated = (context.earlier ?? []).includes(intentId);

  if (intentId.startsWith(PRACTICE_PREFIX)) {
    const practice = getPractice(intentId.slice(PRACTICE_PREFIX.length))!;
    const taught = teach(practice, '', turn, { topicId: context.last?.topicId });
    return { ...taught, actions: withRun(practice, reply.actions) };
  }

  if (isTopic(intentId)) {
    const options = practicesFor(intentId);
    // Asked again: a different practice than last time, and say so.
    const practice = repeated && options.length > 1 ? options[1] : options[0];
    let actions = reply.actions;
    let text = reply.text;
    if (repeated) {
      text = `${t(pick(lines.again, turn))}\n\n${t(text)}`;
      if (practice) actions = [practiceAction(practice), ...actions.filter((action) => action.type !== 'practice')];
    }
    if (!practice) return { ...reply, text, actions, memory: { state: 'understanding', intentId, topicId: intentId } };
    return {
      ...reply,
      text,
      actions,
      followUp: pick(lines.offerPractice(practice), turn),
      suggestions: [YES, NOT_NOW, ...(reply.suggestions ?? []).slice(0, 2)],
      memory: { state: 'offering', intentId, topicId: intentId, practiceId: practice.id },
    };
  }

  if (intentId.startsWith('practices:') || intentId === LENGTH_INTENT) {
    return { ...reply, memory: { state: 'offering', intentId, topicId: context.last?.topicId } };
  }
  if (intentId === 'greeting') {
    const name = context.profile?.name;
    // "Hi there, Ana." The wording with a name is its own line to translate.
    const text = name ? t(reply.text.replace(/^(Hi there|Hello again)\./, '$1, {name}.'), { name }) : reply.text;
    return { ...reply, text, memory: { state: 'greeting', intentId } };
  }
  if (intentId === 'thanks' || intentId === 'goodbye') return { ...reply, memory: { state: 'closing', intentId } };
  return { ...reply, memory: { state: 'understanding', intentId, topicId: ranked && isTopic(ranked.intent.id) ? ranked.intent.id : undefined } };
}

/** Whether two topics are worth asking about: both written answers, and not the same thing twice. */
function bothTopics(a: RankedIntent | undefined, b: RankedIntent | undefined): boolean {
  return Boolean(a && b && isTopic(a.intent.id) && isTopic(b.intent.id) && TOPIC_LABELS[a.intent.id] && TOPIC_LABELS[b.intent.id]);
}

/**
 * A question about the reader: answered from their data once they've said
 * Kapwa may, asked first if they haven't, and politely declined if they said no.
 */
function personalTurn(intentId: string, context: DialogueContext): DialogueTurn {
  const memory: DialogueMemory = { state: 'understanding', intentId };
  if (intentId === `${PERSONAL_PREFIX}allow`) {
    return {
      ...say('Thank you. I’ll use your sessions, saved items and recent screens on this phone to answer questions about you. Nothing leaves your phone, and you can say “stop using my activity” any time.', memory, {
        suggestions: ['Who am I?', 'What did I do last time?', 'How am I doing?'],
      }),
      effects: { consent: 'yes' },
    };
  }
  if (intentId === `${PERSONAL_PREFIX}forbid`) {
    return {
      ...say('Done. I’ve stopped using your activity and cleared the list of screens I kept for it. Your sessions and progress in the app are untouched.', memory, {
        suggestions: kapwaQuickReplies,
      }),
      effects: { consent: 'no' },
    };
  }
  if (context.personal === 'no' || !context.profile) {
    return say(withoutActivity(context.profile), memory, { suggestions: ['Use my activity', ...kapwaQuickReplies.slice(0, 3)] });
  }
  if (context.personal !== 'yes') {
    return say(
      'I can answer that by looking at your activity in Serenity: your name, sessions, saved items and the screens you open. It all stays on this phone, and you can turn it off any time. Is that okay?',
      { state: 'clarifying', intentId: 'consent', options: [intentId] },
      { suggestions: ['Yes, that’s okay', 'No thanks'] },
    );
  }
  const reply = personalReply(intentId, context.profile);
  return { intentId, text: reply.text, actions: reply.actions, suggestions: reply.suggestions, prepared: true, memory };
}

/** A match this weak is a guess: only near misses of a single word. */
const WEAK_SCORE = 1;
/** Two topics tied below this score are a real question of which was meant. */
const TIE_ASK_BELOW = 2;

/**
 * Kapwa's next turn: the message read against the conversation so far.
 *
 * Order: safety, then a short reply that fits the moment ("yes", "it
 * helped"), then the best intent, asking instead when it is a guess or two
 * topics fit equally, and otherwise the honest fallback.
 */
export function converse(message: string, context: DialogueContext = {}): DialogueTurn {
  return speaking(context.lang ?? 'en', () => {
    // A translated button, tapped or typed out, is read as the English it shows.
    const reply = respond(sourceOf(message) ?? message, context);
    // Fixed lines translate as they leave; lines with blanks already have.
    return { ...reply, text: t(reply.text), ...(reply.followUp ? { followUp: t(reply.followUp) } : {}) };
  });
}

function respond(message: string, context: DialogueContext): DialogueTurn {
  const turn = context.turn ?? 0;
  const last = context.last;

  const risk = safetyKind(message);
  if (risk) {
    // Translated, with the English underneath while the translation is in beta.
    const reply = safetyReplyIn(risk === 'crisis' ? crisisReply : medicalUrgentReply, currentLanguage());
    return { ...reply, prepared: true, memory: { state: 'safety', intentId: reply.intentId } };
  }

  // "Call me Ana": remembered as the name the app uses.
  const given = readGivenName(message);
  if (given) {
    const greeting = pick(['Nice to meet you, {name}. I’ll call you that from now on.', 'Hello, {name}. I’ll remember that.'], turn);
    return {
      ...say(`${t(greeting, { name: given })} ${t('How are you feeling today?')}`, { state: 'understanding', intentId: 'name-given' }, {
        suggestions: kapwaQuickReplies,
      }),
      effects: { name: given },
    };
  }

  const { ranked, onlyNegated, wordCount } = rankIntents(message, { supportTrack: context.supportTrack });
  const top = ranked[0];
  const short = readReply(message);

  // The answer to "may I look at your activity?".
  if (last?.intentId === 'consent' && short && (short.kind === 'yes' || short.kind === 'no')) {
    if (short.kind === 'no') {
      return {
        ...say('Of course. I won’t look at your activity. If you change your mind, just say “use my activity”.', {
          state: 'understanding',
          intentId: 'consent-no',
        }, { suggestions: kapwaQuickReplies }),
        effects: { consent: 'no' },
      };
    }
    const asked = last.options?.[0] ?? `${PERSONAL_PREFIX}who`;
    return { ...personalTurn(asked, { ...context, personal: 'yes' }), effects: { consent: 'yes' } };
  }

  // A short reply, when it says more than anything else in the message, or
  // as much, straight after Kapwa asked something. Otherwise "breathwork
  // please" would be read as "please".
  const awaiting = last !== undefined && AWAITING.includes(last.state);
  const mostly = short !== null && short.score * 2 >= wordCount;
  if (short && (awaiting || mostly) && (!top || short.score > top.score || (awaiting && short.score === top.score))) {
    // "Yes" to "did you mean…?": the option it was asked about.
    if (last?.state === 'clarifying' && short.kind === 'yes' && last.options?.[0]) {
      const option = kapwaIntents.find((intent) => intent.id === last.options![0]);
      if (option) return withState(answer(option, message, { turn, wordCount }), { intent: option, score: 1 }, context, turn);
    }
    const contextual = inContext(short.kind, message, last, turn);
    if (contextual) return contextual;
  }

  if (top?.intent.id.startsWith(PERSONAL_PREFIX)) return personalTurn(top.intent.id, context);

  if (!top) {
    if (onlyNegated) {
      return say(pick(lines.notWeighing, turn), { state: 'understanding', intentId: 'not-weighing' }, { suggestions: kapwaQuickReplies });
    }
    // Not understood twice running: say so differently, never the same words again.
    const text = last?.state === 'fallback' ? pick(lines.stillUnclear, turn) : kapwaFallback.text;
    return { ...kapwaFallback, text, suggestions: kapwaQuickReplies, memory: { state: 'fallback', intentId: kapwaFallback.intentId } };
  }

  // A guess: nothing but a near miss, and something else nearly as likely.
  // A near miss with no rival ("overthnking") is simply answered.
  const label = labelFor(top.intent.id);
  if (top.score < WEAK_SCORE && label && ranked[1] && ranked[1].score >= top.score - 0.25 && bothTopics(top, ranked[1])) {
    return say(pick(lines.didYouMean(label), turn), { state: 'clarifying', intentId: 'clarify', options: [top.intent.id] }, {
      suggestions: ['Yes', 'No, that’s not it'],
    });
  }

  // Two topics fit equally, and on thin evidence (a word each): ask which.
  // A tie of whole phrases is answered with the more specific topic.
  const second = ranked[1];
  if (
    second &&
    second.score === top.score &&
    top.score < TIE_ASK_BELOW &&
    bothTopics(top, second) &&
    !(context.earlier ?? []).includes(top.intent.id)
  ) {
    const options = [top.intent.id, second.intent.id];
    return say(pick(lines.whichOne, turn), { state: 'clarifying', intentId: 'clarify', options }, {
      suggestions: options.map((id) => TOPIC_LABELS[id]),
    });
  }

  return withState(answer(top.intent, message, { turn, wordCount }), top, context, turn);
}
