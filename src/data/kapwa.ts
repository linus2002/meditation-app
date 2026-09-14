/**
 * Kapwa: Serenity's built-in guide.
 *
 * Deliberately simple and honest about it. Kapwa is not a person and not an
 * AI — there is no API behind it. Kapwa matches keywords in what the reader
 * types to replies written for Serenity, and offers real sessions and screens
 * to tap into. Everything runs on the phone; nothing typed leaves it.
 *
 * Session ids must exist in `src/data/meditations.ts` (a test checks).
 */

export type KapwaAction =
  | { type: 'session'; id: string }
  | { type: 'page'; href: string; label: string };

export interface KapwaIntent {
  id: string;
  /** Words or short phrases; matched whole, case and punctuation ignored. */
  keywords: string[];
  /** Rotated by turn, so repeating a question does not repeat the answer. */
  replies: string[];
  actions?: KapwaAction[];
  /** Only offered where the cancer support track is switched on. */
  supportTrackOnly?: boolean;
}

export interface KapwaReply {
  intentId: string;
  text: string;
  actions: KapwaAction[];
}

export const kapwaWelcome: KapwaReply = {
  intentId: 'welcome',
  text: 'Hi, I’m Kapwa. I can help you find a session for how you’re feeling, or show you around Serenity. How are you today?',
  actions: [],
};

/** Tappable openers, shown under Kapwa's latest message. */
export const kapwaQuickReplies: string[] = [
  'I feel stressed',
  'I can’t sleep',
  'Help me focus',
  'I’m new to meditation',
  'What can you do?',
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
];

export const crisisReply: KapwaReply = {
  intentId: 'crisis',
  text: 'I’m really sorry you’re going through this. I’m only a simple guide and I can’t help with something this important — but you deserve support right now. If you might act on these thoughts or you’re in danger, please call your local emergency number now. You can also reach a crisis line or talk to someone you trust. You don’t have to go through this alone.',
  actions: [],
};

export const kapwaFallback: KapwaReply = {
  intentId: 'fallback',
  text: 'I’m not sure I understood — I know simple things best. I can help with stress, sleep, focus, feeling low, getting started, or finding your way around Serenity. Try one of the suggestions below.',
  actions: [],
};

export const kapwaIntents: KapwaIntent[] = [
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
      'sleep', 'asleep', 'insomnia', 'sleepless', 'awake', 'bedtime', 'night', 'tired', 'rest',
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
    id: 'body',
    keywords: ['body', 'tension', 'headache', 'sore', 'pain', 'shoulders', 'relax', 'relaxed'],
    replies: [
      'Let’s check in with your body. This one moves your attention slowly from head to toe:',
    ],
    actions: [
      { type: 'session', id: 'body-scan' },
      { type: 'session', id: 'ocean-drift' },
    ],
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
    id: 'beginner',
    keywords: [
      'new', 'beginner', 'start', 'started', 'first time', 'how to meditate', 'how do i meditate',
      'never meditated', 'learn',
    ],
    replies: [
      'Welcome. Meditation is simply noticing your breath and gently coming back when your mind wanders — wandering is normal, not failing. Here’s a good first session:',
    ],
    actions: [
      { type: 'session', id: 'free-your-mind' },
      { type: 'session', id: 'midday-reset' },
    ],
  },
  {
    id: 'circles',
    keywords: ['circle', 'circles', 'group', 'community', 'together', 'friends', 'people'],
    replies: [
      'Circles are small groups who sit at the same time each day — no leaderboards, just company. You can find one here:',
    ],
    actions: [{ type: 'page', href: '/circles', label: 'Find a circle' }],
  },
  {
    id: 'timer',
    keywords: ['timer', 'silent', 'silence', 'unguided', 'bells', 'bell'],
    replies: ['For a quiet sit with just gentle bells, use the timer:'],
    actions: [{ type: 'page', href: '/timer', label: 'Open the timer' }],
  },
  {
    id: 'stories',
    keywords: ['story', 'stories', 'read', 'listen', 'bedtime story'],
    replies: ['Stories are read aloud and made for drifting off:'],
    actions: [{ type: 'page', href: '/stories', label: 'Browse stories' }],
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
    id: 'progress',
    keywords: ['progress', 'streak', 'stats', 'minutes', 'history', 'how am i doing'],
    replies: ['Your streak, mindful minutes and weekly chart are on your profile:'],
    actions: [{ type: 'page', href: '/profile', label: 'Open Profile' }],
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
      'robot', 'bot', 'kapwa',
    ],
    replies: [
      'I’m Kapwa, Serenity’s built-in guide. I’m not a person and I’m not an AI — I answer from a set of replies written for Serenity, so I understand simple things best. I’m also not a replacement for a doctor or therapist.',
    ],
  },
  {
    id: 'help',
    keywords: ['help', 'what can you do', 'options', 'menu', 'features'],
    replies: [
      'I can suggest a session for stress, sleep, focus, low moods, anger or body tension, help you get started, and point you to Circles, the timer, stories, reminders or your progress. Just tell me how you feel.',
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
