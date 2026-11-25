/**
 * Kapwa: Serenity's built-in guide.
 *
 * The on-device half of Kapwa. Keywords in what the reader types are matched
 * to replies written for Serenity, with real sessions and screens to tap
 * into. This runs on the phone and is always used for crisis and medical
 * messages, for the actions under every reply, and as the whole reply when
 * the AI (`lib/kapwa-ai`, switched on by NEXT_PUBLIC_KAPWA_AI) is off or
 * unreachable. These replies describe the keyword guide, not the AI.
 *
 * Session, yoga, story and sound ids must exist in the content (a test
 * checks). The detailed answers to everyday questions are in
 * `data/kapwa-topics`.
 */

import { kapwaTopics } from '@/data/kapwa-topics';
import { collectionIntents, lengthIntent, practiceFor, practiceIntents } from '@/lib/kapwa-knowledge';
import { personalIntents } from '@/lib/kapwa-profile';
import { crisisLines, emergencyLine, type SafetyLine } from '@/data/safety-lines';
import type { SoundscapeId } from '@/lib/audio/soundscapes';

export type KapwaAction =
  | { type: 'session'; id: string }
  | { type: 'yoga'; id: string }
  | { type: 'story'; id: string }
  /** A sound to play in the Sleep tab's mixer. */
  | { type: 'sound'; id: SoundscapeId }
  /** A practice from the knowledge base, taught step by step in the chat when tapped. */
  | { type: 'practice'; id: string }
  /** Starts a practice as a timed, guided run in the chat (lib/kapwa-runner). */
  | { type: 'run'; id: string }
  | { type: 'page'; href: string; label: string }
  | { type: 'call'; line: SafetyLine };

export interface KapwaIntent {
  id: string;
  /**
   * Words or short phrases, matched whole and in order; case, punctuation and
   * small typos ignored. A phrase scores one point per word.
   */
  keywords: string[];
  /** Rotated by turn, so repeating a question does not repeat the answer. */
  replies: string[];
  actions?: KapwaAction[];
  /** Questions offered as buttons under this reply, to go on from it. */
  suggestions?: string[];
  /** A written answer that is given in full even when the AI is on. */
  prepared?: boolean;
  /** Only offered where the cancer support track is switched on. */
  supportTrackOnly?: boolean;
}

export interface KapwaReply {
  intentId: string;
  text: string;
  actions: KapwaAction[];
  suggestions?: string[];
  prepared?: boolean;
}

export const kapwaWelcome: KapwaReply = {
  intentId: 'welcome',
  text: 'Hi, I’m Kapwa. There’s no right way to start: tell me how you feel in a few words, or pick one of these. I can suggest a meditation, a gentle yoga session, a story or a sound that fits.',
  actions: [],
};

/** Tappable openers, shown under the welcome and any reply without its own. */
export const kapwaQuickReplies: string[] = [
  'I feel overwhelmed',
  'I feel sad and heavy',
  'I can’t sleep',
  'I’m anxious about the future',
  'I’m too hard on myself',
  'I miss someone',
  'Help me understand myself',
  'Help me build a habit',
];

/**
 * Checked before anything else. A reader who mentions harming themselves gets
 * care and a way to real help — never a meditation suggestion.
 */
export const crisisKeywords: string[] = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'end it all',
  'want to die',
  'wanna die',
  'self harm',
  'hurt myself',
  'harm myself',
  'cutting myself',
  'don’t want to live',
  'dont want to live',
  'no reason to live',
  'no point living',
  'no point in living',
  'not worth living',
  'can’t go on',
  'cant go on',
  'better off dead',
  'better off without me',
  'take my life',
  'take my own life',
  'overdose',
  'don’t want to be here anymore',
  'dont want to be here anymore',
];

export const crisisReply: KapwaReply = {
  intentId: 'crisis',
  text: 'I’m really sorry you’re going through this. I’m only a simple guide and I can’t help with something this important, but you deserve support right now. The crisis hotline below is free and answers day and night. If you might act on these thoughts or you’re in danger, call emergency services now. You don’t have to go through this alone.',
  actions: [
    { type: 'call', line: crisisLines[0] },
    { type: 'call', line: crisisLines[1] },
    { type: 'call', line: emergencyLine },
  ],
};

/**
 * What follows a crisis reply, whatever is typed next ("yes, tonight", "ok").
 * DRAFT wording: needs clinical review.
 */
export const crisisFollowUpReply: KapwaReply = {
  intentId: 'crisis',
  text: 'Thank you for telling me. A real person can help with this in a way I can’t. Please call one of these numbers now, and if you can, move away from anything you could hurt yourself with and stay near someone you trust.',
  actions: crisisReply.actions,
};

/**
 * Checked straight after the crisis list. During cancer treatment these can be
 * signs of infection or another emergency, and the right answer is the care
 * team or emergency services — never a meditation. Phrases are specific on
 * purpose: "blood" alone would catch "blood test tomorrow".
 */
export const medicalUrgentKeywords: string[] = [
  'fever',
  'high temperature',
  'temperature is high',
  'chills',
  'shivering',
  'chest pain',
  'chest hurts',
  'can’t breathe',
  'cant breathe',
  'hard to breathe',
  'trouble breathing',
  'short of breath',
  'shortness of breath',
  'breathless',
  'bleeding',
  'coughing blood',
  'vomiting blood',
  'blood in my',
  'can’t stop vomiting',
  'cant stop vomiting',
  'keep vomiting',
  'keep throwing up',
  'fainted',
  'passed out',
  'seizure',
  'severe pain',
  'unbearable pain',
  'worst pain',
  'worst headache',
];

export const medicalUrgentReply: KapwaReply = {
  intentId: 'medical-urgent',
  text: 'That could need medical attention now, and I can’t help assess it. Please contact your care team or your hospital’s after-hours line straight away. If you have a fever during chemotherapy, trouble breathing, chest pain or heavy bleeding, or you feel very unwell, call emergency services.',
  actions: [{ type: 'call', line: emergencyLine }],
};

export const kapwaFallback: KapwaReply = {
  intentId: 'fallback',
  text: 'I’m not sure I understood — I know simple things best. I can help with stress, sleep, focus, feeling low, getting started, or finding your way around Serenity. If you’re in danger or thinking of hurting yourself, please call the crisis line now.',
  // The word lists will always miss someone. This is what they get instead of a dead end.
  actions: [{ type: 'call', line: crisisLines[0] }],
};

/**
 * Each topic also offers one practice from the knowledge base to try right
 * in the chat, first among its buttons.
 */
const topicsWithPractice: KapwaIntent[] = kapwaTopics.map((topic) => {
  const practice = practiceFor(topic.id);
  if (!practice) return topic;
  return { ...topic, actions: [{ type: 'practice', id: practice.id }, ...(topic.actions ?? [])] };
});

/**
 * Most specific first, so a tie goes to it: a length ("a 5 minute
 * meditation"), a list ("breathing techniques"), a practice by name ("box
 * breathing"), a detailed topic ("how do I stop overthinking"), and last the
 * general replies ("stress").
 */
const intentsInOrder: KapwaIntent[] = [
  // "Who am I", "my progress": about the reader, answered from their own data.
  ...personalIntents,
  lengthIntent,
  ...collectionIntents,
  ...practiceIntents,
  ...topicsWithPractice,
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta'],
    replies: [
      'Hi there. How are you feeling right now? You can tell me in a few words, or tap a suggestion below.',
      'Hello again. What would help most today?',
    ],
  },
  {
    id: 'stress',
    keywords: [
      'stress', 'stressed', 'stressful', 'anxious', 'anxiety', 'worried', 'worry', 'panic',
      'overwhelmed', 'nervous', 'tense', 'pressure', 'racing thoughts',
    ],
    replies: [
      'That sounds like a lot to carry. A few slow breaths can take the edge off. These help when your mind won’t settle:',
      'You’re not alone in feeling this way. Let’s slow things down together:',
    ],
    actions: [
      { type: 'session', id: 'box-breathing' },
      { type: 'session', id: 'quiet-the-noise' },
    ],
  },
  {
    id: 'sleep',
    keywords: [
      'sleep', 'asleep', 'insomnia', 'sleepless', 'awake', 'bedtime', 'tired', 'rest',
      'cant sleep', 'can’t sleep',
    ],
    replies: [
      'Rest can be hard to find. These are made for winding down, and the Sleep tab has sounds to mix and a timer that fades out:',
      'Let’s help your body settle. Try one of these as you get into bed:',
    ],
    actions: [
      { type: 'session', id: 'night-wind-down' },
      { type: 'session', id: 'rain-on-glass' },
      { type: 'page', href: '/sleep', label: 'Open Sleep' },
    ],
  },
  {
    id: 'focus',
    keywords: ['focus', 'concentrate', 'concentration', 'distracted', 'study', 'studying', 'work', 'productive', 'clarity'],
    replies: [
      'Let’s clear a little space. A short reset can help you come back to what matters:',
      'Focus comes back more easily after a pause. Here are two good ones:',
    ],
    actions: [
      { type: 'session', id: 'midday-reset' },
      { type: 'session', id: 'morning-clarity' },
    ],
  },
  {
    id: 'low',
    keywords: ['sad', 'down', 'lonely', 'alone', 'low', 'cry', 'crying', 'grief', 'hurt', 'heartbroken', 'depressed', 'empty'],
    replies: [
      'I’m sorry today feels heavy. You don’t have to fix it right now. This one is gentle and kind. And if this feeling stays with you, talking to someone you trust or a professional can really help.',
      'That sounds hard. Be gentle with yourself today — this might help a little:',
    ],
    actions: [{ type: 'session', id: 'open-heart' }],
  },
  {
    id: 'angry',
    keywords: ['angry', 'anger', 'mad', 'frustrated', 'frustration', 'irritated', 'annoyed', 'furious'],
    replies: [
      'Anger carries a lot of energy. Slowing your breath gives it somewhere to go:',
    ],
    actions: [{ type: 'session', id: 'box-breathing' }],
  },
  {
    // Before `body`, so "my body is in pain" lands here on a tie.
    id: 'pain',
    keywords: ['pain', 'painful', 'hurts', 'hurting', 'ache', 'aching', 'headache', 'head hurts', 'sore', 'nausea', 'nauseous'],
    replies: [
      'I’m sorry you’re hurting. If the pain or sickness is new, severe or getting worse, please tell your care team. I can’t judge what it means. If it’s familiar and you’ve been told how to manage it, slow breathing can help you soften around it a little:',
    ],
    actions: [{ type: 'session', id: 'body-scan' }],
  },
  {
    id: 'short',
    keywords: ['busy', 'no time', 'quick', 'short', 'five minutes', '5 minutes', 'few minutes'],
    replies: ['Even a few minutes counts. Try one of these:'],
    actions: [
      { type: 'session', id: 'midday-reset' },
      { type: 'session', id: 'box-breathing' },
    ],
  },
  {
    id: 'timer',
    keywords: ['timer', 'silent', 'silence', 'unguided', 'bells', 'bell'],
    replies: ['For a quiet sit with just gentle bells, use the timer:'],
    actions: [{ type: 'page', href: '/timer', label: 'Open the timer' }],
  },
  {
    id: 'reminders',
    keywords: ['reminder', 'reminders', 'notification', 'notifications', 'remind', 'inspiration', 'quote'],
    replies: [
      'You can set a daily reminder, a bedtime nudge and a daily inspiration message here:',
    ],
    actions: [{ type: 'page', href: '/notifications', label: 'Notifications' }],
  },
  {
    id: 'support',
    keywords: ['cancer', 'chemo', 'chemotherapy', 'scan', 'diagnosis', 'treatment', 'oncology', 'caregiver', 'tumor', 'tumour'],
    replies: [
      'Serenity has a quiet space for people in and after cancer treatment, and for those caring for them. It’s support alongside your care team, not a substitute for it:',
    ],
    actions: [{ type: 'page', href: '/support', label: 'Open Support' }],
    supportTrackOnly: true,
  },
  {
    id: 'about',
    keywords: [
      'who are you', 'what are you', 'are you real', 'real person', 'human', 'ai', 'chatbot',
      'robot', 'bot',
    ],
    replies: [
      'I’m Kapwa, Serenity’s built-in guide. I’m not a person and I’m not an AI — I answer from a set of replies written for Serenity, so I understand simple things best. I’m also not a replacement for a doctor or therapist.',
    ],
  },
  {
    id: 'help',
    keywords: ['help', 'what can you do', 'options', 'menu', 'features'],
    replies: [
      'I can help when you’re stressed, sad, can’t sleep, anxious about the future, hard on yourself, or going through something with someone. I can also help you understand yourself a little better, or build a calmer habit. For each, I’ll suggest something in Serenity that fits: a meditation, a gentle yoga session, a story or a sound. Just tell me how you feel, in any words.',
    ],
    actions: [
      { type: 'page', href: '/meditations', label: 'Meditations' },
      { type: 'page', href: '/yoga', label: 'Yoga' },
      { type: 'page', href: '/stories', label: 'Stories' },
      { type: 'page', href: '/sleep', label: 'Sounds' },
    ],
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank you', 'thank u', 'ty', 'salamat'],
    replies: ['You’re welcome. I’m here whenever you need a moment.'],
  },
  {
    id: 'goodbye',
    keywords: ['bye', 'goodbye', 'good night', 'see you', 'later'],
    replies: ['Take care of yourself. Come back any time.'],
  },
];

/**
 * The support track comes first where it is on: for someone in cancer
 * treatment, "chemo tomorrow" is about the support space, not a general
 * worry about tomorrow.
 */
export const kapwaIntents: KapwaIntent[] = [
  ...intentsInOrder.filter((intent) => intent.supportTrackOnly),
  ...intentsInOrder.filter((intent) => !intent.supportTrackOnly),
];
