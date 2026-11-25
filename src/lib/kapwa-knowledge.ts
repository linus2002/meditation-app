import type { KapwaAction, KapwaIntent, KapwaReply } from '@/data/kapwa';
import { practiceKinds, practices, type Practice, type PracticeKind } from '@/data/kapwa-knowledge';
import { allSessions, getMeditation } from '@/data/meditations';
import type { CategorySlug, Meditation } from '@/types';

/**
 * Finding things in Kapwa's knowledge base (data/kapwa-knowledge) and in the
 * app's own catalogue, and turning them into replies.
 *
 * - Each practice becomes an intent, matched by its name ("box breathing",
 *   "body scan", "how long should I meditate"), whose reply teaches it step
 *   by step and offers the sessions in Serenity that go with it.
 * - Each kind becomes a list ("breathing techniques", "journaling prompts").
 * - A length in the message ("a 5 minute meditation", "10 mins") picks app
 *   meditations of about that length, from whatever is in the catalogue now,
 *   so sessions added in Sanity are suggested without changing Kapwa.
 */

export const PRACTICE_PREFIX = 'practice:';
export const LENGTH_INTENT = 'meditation-length';

/** The most buttons under one reply. */
const MAX_ACTIONS = 4;

export function getPractice(id: string): Practice | undefined {
  return practices.find((practice) => practice.id === id);
}

// ─── Entities: how long ─────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60,
};

export interface LengthRequest {
  /** Minutes asked for, when a number was given. */
  minutes?: number;
  /** "quick", "short" or "long", when no number was. */
  feel?: 'short' | 'long';
}

/**
 * How long the reader wants, from what they typed: "5 min", "a 10-minute",
 * "five minutes", "half an hour", "something quick". Empty when it doesn't say.
 */
export function readLength(text: string): LengthRequest {
  const plain = text.toLowerCase().replace(/[’']/g, '');
  const number = plain.match(/\b(\d{1,3})\s*-?\s*(m|min|mins|minute|minutes)\b/);
  if (number) {
    const minutes = Number(number[1]);
    if (minutes > 0 && minutes <= 180) return { minutes };
  }
  const word = plain.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty)[\s-]*(min|mins|minute|minutes)\b/);
  if (word) return { minutes: NUMBER_WORDS[word[1]] };
  if (/\bhalf an hour\b|\bhalf hour\b/.test(plain)) return { minutes: 30 };
  if (/\ban hour\b|\bone hour\b/.test(plain)) return { minutes: 60 };
  if (/\b(quick|short|brief|little|busy|no time)\b/.test(plain)) return { feel: 'short' };
  if (/\b(long|longer|deep|extended)\b/.test(plain)) return { feel: 'long' };
  return {};
}

// ─── Picking app meditations ────────────────────────────────────────────────

const sessionMinutes = (session: Meditation) => Math.max(1, Math.round(session.durationSeconds / 60));

/** The target length for a request: a number, or what "short" and "long" mean here. */
function targetMinutes(length: LengthRequest, fallback?: number): number | undefined {
  if (length.minutes) return length.minutes;
  if (length.feel === 'short') return 4;
  if (length.feel === 'long') return 17;
  return fallback;
}

/**
 * Meditations in the catalogue that fit: in one of `categories` (any, when
 * none are given), and as close as possible to `minutes` without running
 * much over it. Distinct, at most `count`.
 */
export function suggestSessions({
  categories,
  minutes,
  exclude = [],
  count = 2,
}: {
  categories?: CategorySlug[];
  minutes?: number;
  exclude?: string[];
  count?: number;
}): Meditation[] {
  const skip = new Set(exclude);
  const pool = allSessions.filter(
    (session) => !skip.has(session.id) && (!categories?.length || categories.includes(session.category)),
  );
  const score = (session: Meditation) => {
    // Earlier categories are the better fit.
    const categoryRank = categories?.length ? categories.indexOf(session.category) : 0;
    if (minutes === undefined) return categoryRank;
    const length = sessionMinutes(session);
    // Running over what was asked counts double: "10 minutes" is a limit, not a goal.
    const gap = length > minutes ? (length - minutes) * 2 : minutes - length;
    return gap * 10 + categoryRank;
  };
  return [...pool].sort((a, b) => score(a) - score(b)).slice(0, count);
}

const sessionAction = (session: Meditation): KapwaAction => ({ type: 'session', id: session.id });

function dedupe(actions: KapwaAction[]): KapwaAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    // Two sessions with the same title look like one offered twice.
    const sessionTitle = action.type === 'session' ? getMeditation(action.id)?.title : undefined;
    const key = sessionTitle
      ? `session:${sessionTitle}`
      : action.type === 'page'
        ? action.href
        : action.type === 'call'
          ? action.line.dial
          : `${action.type}:${action.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Writing replies ────────────────────────────────────────────────────────

function stepTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

/** A practice, written out for the chat. */
export function practiceText(practice: Practice): string {
  if (practice.kind === 'education') {
    return `${practice.title}\n\n${practice.steps.map((step) => step.text).join('\n\n')}`;
  }

  const heading =
    practice.kind === 'journaling'
      ? `${practice.title}\n${practice.summary} Take about ${practice.minutes} minutes, and answer only the ones that speak to you.`
      : `${practice.title} · about ${practice.minutes} min\n${practice.summary}`;

  const steps = practice.steps
    .map((step, index) => `${index + 1}. ${step.text}${step.seconds && practice.kind !== 'journaling' ? ` (${stepTime(step.seconds)})` : ''}`)
    .join('\n');

  const caution = practice.caution ? `\n\nTake care: ${practice.caution}` : '';

  const closing =
    practice.kind === 'journaling'
      ? 'You can write your answers in Reflections; they stay on your phone.'
      : 'Afterwards, notice how you feel. If you’d like a voice to guide you, these in Serenity go with it:';

  return `${heading}\n\n${steps}${caution}\n\n${closing}`;
}

/** What the button for a practice says, under any reply. */
export function practiceLabel(practice: Practice): string {
  if (practice.kind === 'education') return `Read: ${practice.title}`;
  return `Try: ${practice.title} · ${practice.minutes} min`;
}

/** What tapping a practice sends, so it reads in the chat as the reader asking. */
export function practiceAsk(practice: Practice): string {
  return practice.title;
}

/** The questions offered after a practice: two more of its kind, then the whole list. */
function practiceSuggestions(practice: Practice): string[] {
  const sameKind = practices.filter((other) => other.kind === practice.kind && other.id !== practice.id);
  const start = practices.indexOf(practice) % Math.max(1, sameKind.length);
  const next = [...sameKind.slice(start), ...sameKind.slice(0, start)].slice(0, 2).map(practiceAsk);
  return [...next, `More ${practiceKinds[practice.kind].title}`];
}

// ─── Intents ────────────────────────────────────────────────────────────────

/**
 * One intent per practice, matched by its name. The reply's sessions are
 * filled in by `enrichReply`, from the catalogue as it is at the time.
 */
export const practiceIntents: KapwaIntent[] = practices.map((practice) => ({
  id: `${PRACTICE_PREFIX}${practice.id}`,
  keywords: [practice.title, ...practice.keywords],
  replies: [practiceText(practice)],
  actions: practice.related,
  suggestions: practiceSuggestions(practice),
  prepared: true,
}));

const KIND_ORDER: PracticeKind[] = ['breathing', 'grounding', 'meditation', 'mindfulness', 'sleep', 'journaling', 'education'];

/** One intent per kind of practice, listing them all to choose from. */
export const collectionIntents: KapwaIntent[] = KIND_ORDER.map((kind) => {
  const ofKind = practices.filter((practice) => practice.kind === kind);
  const others = KIND_ORDER.filter((other) => other !== kind).slice(0, 2);
  return {
    id: `practices:${kind}`,
    keywords: practiceKinds[kind].keywords,
    replies: [
      kind === 'education'
        ? 'Here are some common questions about meditation. Tap one and I’ll answer it:'
        : `Here are some ${practiceKinds[kind].title} I can walk you through, right here in the chat. Tap one to start:`,
    ],
    actions: ofKind.map((practice) => ({ type: 'practice', id: practice.id }) as KapwaAction),
    suggestions: others.map((other) => `Show me ${practiceKinds[other].title}`),
    prepared: true,
  };
});

/** "A 5 minute meditation", "something quick", "a longer session". */
export const lengthIntent: KapwaIntent = {
  id: LENGTH_INTENT,
  keywords: [
    'minute meditation', 'minutes meditation', 'minutes of meditation', 'minute session', 'minutes session',
    'short meditation', 'quick meditation', 'long meditation', 'longer meditation', 'meditation under',
    'short session', 'quick session', 'longer session',
  ],
  // Written in `enrichReply`, once the length is known.
  replies: [''],
  suggestions: ['Show me breathing techniques', 'What is a good routine for beginners?'],
  prepared: true,
};

/**
 * A practice for each topic, to try right in the chat: the first in the
 * library that names the topic. Added to the topic's own buttons.
 */
export function practiceFor(topicId: string): Practice | undefined {
  return practices.find((practice) => practice.intents.includes(topicId));
}

// ─── Filling in a reply ─────────────────────────────────────────────────────

/**
 * Completes a reply with what depends on the message and the catalogue now:
 * meditations of the length asked for, and sessions to go with a practice.
 */
export function enrichReply(reply: KapwaReply, message: string): KapwaReply {
  const length = readLength(message);

  if (reply.intentId === LENGTH_INTENT) {
    const minutes = targetMinutes(length, 5)!;
    const found = suggestSessions({ minutes, count: MAX_ACTIONS });
    const asked = length.minutes ? `about ${length.minutes} minutes` : length.feel === 'long' ? 'something longer' : 'something short';
    return {
      ...reply,
      text: found.length
        ? `Here are meditations in Serenity for ${asked}. Each one is guided, so you can simply press play and follow along. If none feels right, you can also sit in silence with the timer and gentle bells.`
        : 'I couldn’t find a session of that length right now. The timer lets you sit for exactly as long as you like, with gentle bells.',
      actions: [...found.map(sessionAction), { type: 'page', href: '/timer', label: 'Open the timer' }],
    };
  }

  if (reply.intentId.startsWith(PRACTICE_PREFIX)) {
    const practice = getPractice(reply.intentId.slice(PRACTICE_PREFIX.length));
    if (!practice || !practice.appCategories?.length) return reply;
    const related = reply.actions.filter((action) => action.type !== 'session' || getMeditation(action.id));
    const room = MAX_ACTIONS - related.length;
    if (room <= 0) return { ...reply, actions: dedupe(related) };
    const taken = related.flatMap((action) => (action.type === 'session' ? [action.id] : []));
    const extra = suggestSessions({
      categories: practice.appCategories,
      minutes: targetMinutes(length, practice.minutes),
      exclude: taken,
      count: Math.min(room, 1),
    });
    return { ...reply, actions: dedupe([...related, ...extra.map(sessionAction)]) };
  }

  // Any other reply: when a length was asked for, swap sessions that run
  // well over it for ones of the same kind that fit.
  const minutes = length.minutes;
  if (!minutes) return reply;
  const used = reply.actions.flatMap((action) => (action.type === 'session' ? [action.id] : []));
  const actions = reply.actions.map((action) => {
    if (action.type !== 'session') return action;
    const session = getMeditation(action.id);
    if (!session || sessionMinutes(session) <= minutes + 1) return action;
    const [swap] = suggestSessions({ categories: [session.category], minutes, exclude: used, count: 1 });
    if (!swap || sessionMinutes(swap) > minutes + 1) return action;
    used.push(swap.id);
    return sessionAction(swap);
  });
  return { ...reply, actions: dedupe(actions) };
}
