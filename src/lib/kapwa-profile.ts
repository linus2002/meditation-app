import type { KapwaAction, KapwaIntent } from '@/data/kapwa';
import { getMeditation } from '@/data/meditations';
import { programs } from '@/data/programs';
import { getStory } from '@/data/stories';
import { getYogaSession } from '@/data/yoga';
import { summariseSleep } from '@/lib/sleep-stats';
import { currentStreak, lifetimeTotals } from '@/lib/session-stats';
import { suggestSessions } from '@/lib/kapwa-knowledge';
import { currentLanguage, languageInfo, t } from '@/lib/kapwa-i18n';
import type { CategorySlug, SessionRecord, SleepLog } from '@/types';

/**
 * What Kapwa may know about the person it's talking to, and the replies
 * built from it: who they are, what they did last, their progress, sleep,
 * saved sessions, and a suggestion for today.
 *
 * Everything here is read from data already kept on this phone. Nothing is
 * sent anywhere. Kapwa asks before using it (the plan's consent rule), and
 * the reader can turn it off, which also deletes the screen log
 * (lib/activity-log).
 */

export interface RecentScreen {
  path: string;
  at: number;
}

export interface KapwaProfile {
  /** What the app calls them; empty if they never said. */
  name: string;
  /** Signed in with an account, and its email, or using Serenity as a guest. */
  email?: string;
  /** Every sitting, newest first. */
  sessions: SessionRecord[];
  favorites: string[];
  favoriteStories: string[];
  goalMinutes: number;
  sleepLogs: SleepLog[];
  reflections: number;
  /** Screens opened recently, newest first; only kept while Kapwa may use activity. */
  screens: RecentScreen[];
  /** When they were last in the app before this visit. */
  previousVisitAt?: number;
  now: number;
}

/** Whether the reader lets Kapwa use their activity: yes, no, or not asked yet. */
export type PersonalConsent = 'yes' | 'no' | undefined;

export const PERSONAL_PREFIX = 'me:';

const intent = (id: string, keywords: string[]): KapwaIntent => ({
  id: `${PERSONAL_PREFIX}${id}`,
  keywords,
  // Written by `personalReply`, from the reader's own data.
  replies: [''],
  prepared: true,
});

/** Questions about the reader themself. Matched like any intent, answered from their data. */
export const personalIntents: KapwaIntent[] = [
  intent('who', [
    'who am i', 'who i am', 'whats my name', 'what is my name', 'do you know my name', 'what do you know about me',
    'know about me', 'about me', 'my details', 'my profile', 'my info', 'my information', 'tell me about myself',
    'do you know me', 'do you remember me', 'remember me', 'my account',
  ]),
  intent('last', [
    'last time', 'last session', 'last meditation', 'last meditated', 'when did i last', 'what did i listen',
    'what did i do last', 'last used', 'last opened', 'when was i here', 'last visit', 'what was i doing',
    'where was i', 'recently played', 'where did i leave off', 'pick up where', 'what did i do yesterday',
    'my history', 'what have i done', 'recent activity', 'my activity', 'what did i watch',
  ]),
  intent('progress', [
    'my progress', 'how am i doing', 'my streak', 'my stats', 'my minutes', 'how much have i meditated',
    'how many sessions', 'how many minutes have i', 'how many minutes did i', 'progress', 'streak', 'stats', 'my goal', 'did i meet my goal',
  ]),
  intent('sleep', ['my sleep log', 'how have i been sleeping', 'how did i sleep', 'my sleep', 'my nights', 'sleep log']),
  intent('saved', ['my favorites', 'my favourites', 'my saved', 'saved sessions', 'what have i saved', 'my saved stories']),
  intent('suggest', [
    'what should i do today', 'recommend something for me', 'something for me', 'for me today', 'pick something for me',
    'what do you suggest', 'surprise me', 'what should i listen to', 'what should i try', 'recommend me',
    // The plain ways people ask, which used to fall through to "I didn't understand".
    'suggest', 'suggestion', 'suggestions', 'any suggestions', 'recommend', 'recommendation', 'recommendations',
    'what can you suggest', 'what do you recommend', 'what would you recommend', 'can you suggest',
    'suggest a session', 'suggest a meditation', 'suggest something', 'recommend a session', 'recommend a meditation',
    'what sessions', 'which session', 'which meditation', 'what meditation should i', 'give me a session',
    'give me a meditation', 'where do i start', 'what should i play',
  ]),
  intent('allow', ['use my activity', 'you can use my activity', 'look at my activity', 'allow my activity', 'read my activity']),
  intent('forbid', [
    'stop using my activity', 'dont use my activity', 'forget my activity', 'delete my activity', 'turn off activity',
    'stop reading my activity', 'stop tracking me', 'dont track me',
  ]),
];

/** What a reply that changes what Kapwa may do asks the chat to do. */
export interface ProfileEffects {
  consent?: 'yes' | 'no';
  /** A name the reader gave ("call me Ana"). */
  name?: string;
}

/** "Call me Ana", "my name is Ana": the name, tidied, or null. */
export function readGivenName(message: string): string | null {
  return englishOrFilipinoName(message) ?? hindiName(message);
}

/** Words that follow "call me" or "ako si" without being a name. */
const NOT_A_NAME = /^(not|so|very|just|really|a|an|the|no|none|secret|na|ay|lang|po|ba|nahi|hai|kya|nga)$/i;

function englishOrFilipinoName(message: string): string | null {
  // English, then Filipino ("tawagin mo akong Ana", "ako si Ana", "ang pangalan ko ay Ana"),
  // then Hinglish ("mera naam Ana hai", "mujhe Ana bulao").
  const found = message.match(
    /\b(?:my name is|my names|my name's|call me|i'm called|im called|i am called|tawagin mo (?:akong|ako na|ako)|ako si|pangalan ko ay|pangalan ko|mera naam|mujhe)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,29})/i,
  );
  if (!found) return null;
  // "mujhe" names someone only as "mujhe Ana bulao", not in "mujhe neend nahi aa rahi".
  if (/^mujhe\s/i.test(found[0]) && !/\b(bulao|bulaiye|bulana|kaho|kahiye)\b/i.test(message)) return null;
  const words = found[1].trim().split(/\s+/).filter((word) => !/^(hai|hoon|bulao|bulaiye|kaho|kahiye|po|na)$/i.test(word));
  const name = words.slice(0, 2).join(' ').replace(/[^A-Za-zÀ-ÿ' -]/g, '');
  if (!name || NOT_A_NAME.test(name.split(' ')[0])) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "मेरा नाम अना है", "मुझे अना बुलाओ": a name written in Devanagari. */
function hindiName(message: string): string | null {
  const found = message.match(/(?:मेरा नाम|मुझे)\s+(\p{Script=Devanagari}+)(?:\s+(?:है|बुलाओ|बुलाइए|कहो|कहिए))/u);
  if (!found || /^(बहुत|नहीं|कुछ)$/.test(found[1])) return null;
  return found[1];
}

// ─── Reading the data ───────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

/**
 * "today at 9:14 pm", "yesterday at 7:02 am", "3 days ago", "on 12 Nov", in
 * the language Kapwa is speaking.
 */
export function when(at: number, now: number): string {
  const locale = languageInfo(currentLanguage()).locale;
  const date = new Date(at);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  if (at >= startOfToday) return t('today at {time}', { time });
  if (at >= startOfToday - DAY) return t('yesterday at {time}', { time });
  const days = Math.floor((startOfToday - at) / DAY) + 1;
  if (days < 7) return t('{days} days ago', { days });
  return t('on {date}', { date: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) });
}

const SCREEN_NAMES: Record<string, string> = {
  '/home': 'Home', '/meditations': 'Meditations', '/sleep': 'Sleep', '/yoga': 'Yoga', '/stories': 'Stories',
  '/profile': 'Profile', '/favorites': 'Saved', '/downloads': 'Downloads', '/mixes': 'Mixes', '/calendar': 'Calendar',
  '/reflections': 'Reflections', '/notifications': 'Notifications', '/help': 'Help', '/timer': 'the timer',
  '/activities': 'Daily activities', '/discover': 'Discover', '/search': 'Search', '/assessment': 'the check-in',
  '/support': 'Support',
};

/** What a screen is called, from its path; null for screens not worth naming (Kapwa itself, sign-in). */
export function screenName(path: string): string | null {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (SCREEN_NAMES[clean]) return t(SCREEN_NAMES[clean]);
  const [, kind, id] = clean.split('/');
  if (kind === 'player' && id) return getMeditation(id)?.title ?? null;
  if (kind === 'yoga' && id) return getYogaSession(id) ? t('{title} (yoga)', { title: getYogaSession(id)!.title }) : null;
  if (kind === 'stories' && id) return getStory(id) ? t('{title} (story)', { title: getStory(id)!.title }) : null;
  if (kind === 'programs' && id) return programs.find((program) => program.id === id)?.title ?? null;
  return null;
}

function title(session: SessionRecord): string {
  return getMeditation(session.meditationId)?.title ?? t('a session');
}

const minutesOf = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/** The category they come back to most, by sessions. */
function favouriteCategory(sessions: SessionRecord[]): CategorySlug | null {
  const counts = new Map<CategorySlug, number>();
  for (const session of sessions) {
    const category = getMeditation(session.meditationId)?.category;
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  let best: CategorySlug | null = null;
  for (const [category, count] of counts) if (!best || count > (counts.get(best) ?? 0)) best = category;
  return best;
}

const CATEGORY_WORDS: Record<CategorySlug, string> = {
  focus: 'focus', sleep: 'sleep', anxiety: 'calming anxiety', happiness: 'kindness and gratitude', relaxation: 'relaxation', breathing: 'breathing',
};

const categoryWords = (category: CategorySlug) => t(CATEGORY_WORDS[category]);

function minutesToday(sessions: SessionRecord[], now: number): number {
  const day = new Date(now);
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  return Math.round(sessions.filter((session) => session.date === key).reduce((total, session) => total + session.seconds, 0) / 60);
}

// ─── Replies ────────────────────────────────────────────────────────────────
// Written in English, each sentence translated as it is filled in. Buttons
// stay in English here; the chat shows them translated.

export interface PersonalAnswer {
  text: string;
  actions: KapwaAction[];
  suggestions: string[];
}

const PRIVACY = 'All of this is on your phone; I only read it to answer you.';

function who(profile: KapwaProfile): PersonalAnswer {
  const lines: string[] = [];
  lines.push(profile.name ? t('You’re {name}.', { name: profile.name }) : t('I don’t know your name yet. You can tell me: “call me …”.'));
  lines.push(profile.email ? t('You’re signed in as {email}.', { email: profile.email }) : t('You’re using Serenity as a guest.'));
  const { sessions } = profile;
  if (sessions.length) {
    const totals = lifetimeTotals(sessions);
    const first = sessions[sessions.length - 1];
    const streak = currentStreak(sessions, new Date(profile.now));
    const category = favouriteCategory(sessions);
    lines.push(
      t(
        totals.sessions === 1
          ? 'You started {when}, and since then you’ve done {sessions} session: {minutes} mindful minutes in all.'
          : 'You started {when}, and since then you’ve done {sessions} sessions: {minutes} mindful minutes in all.',
        { when: when(first.startedAt, profile.now), sessions: totals.sessions, minutes: totals.minutes },
      ),
    );
    if (streak > 0) lines.push(t('You’re on a {days}-day streak.', { days: streak }));
    if (category) lines.push(t('You come back most often for {category}.', { category: categoryWords(category) }));
    lines.push(t('Your last session was {title}, {when}.', { title: title(sessions[0]), when: when(sessions[0].startedAt, profile.now) }));
  } else {
    lines.push(t('You haven’t done a session yet. Whenever you’re ready, I can suggest a first one.'));
  }
  lines.push(t('Your daily goal is {minutes} minutes.', { minutes: profile.goalMinutes }));
  if (profile.favorites.length + profile.favoriteStories.length) {
    lines.push(t('You’ve saved {count} sessions and stories.', { count: profile.favorites.length + profile.favoriteStories.length }));
  }
  return {
    text: `${lines.join(' ')}\n\n${t(PRIVACY)}`,
    actions: [{ type: 'page', href: '/profile', label: 'Open Profile' }],
    suggestions: ['What did I do last time?', 'How am I doing?', 'What should I do today?'],
  };
}

function last(profile: KapwaProfile): PersonalAnswer {
  const { sessions, now } = profile;
  const parts: string[] = [];
  const actions: KapwaAction[] = [];
  if (sessions.length) {
    const latest = sessions[0];
    const meditation = getMeditation(latest.meditationId);
    const vars = { title: title(latest), when: when(latest.startedAt, now), minutes: minutesOf(latest.seconds) };
    parts.push(
      latest.completed
        ? t('Your last session was {title}, {when}, and you listened to the end ({minutes} min).', vars)
        : t('Your last session was {title}, {when}, and you stopped after {minutes} min.', vars),
    );
    if (meditation) actions.push({ type: 'session', id: meditation.id });
    const before = sessions.slice(1, 3).map((session) => `${title(session)} (${when(session.startedAt, now)})`);
    if (before.length) parts.push(t('Before that: {sessions}.', { sessions: before.join(t(', and ')) }));
  } else {
    parts.push(t('You haven’t finished a session yet.'));
  }
  if (profile.previousVisitAt) parts.push(t('Before today’s visit, you last opened Serenity {when}.', { when: when(profile.previousVisitAt, now) }));
  const screens = [...new Set(profile.screens.map((screen) => screenName(screen.path)).filter((name): name is string => Boolean(name)))].slice(0, 5);
  if (screens.length) parts.push(t('Recently you opened: {screens}.', { screens: screens.join(', ') }));
  if (!sessions.length && !screens.length && !profile.previousVisitAt) parts.push(t('There’s nothing else for me to look back on yet.'));
  return {
    text: `${parts.join(' ')}\n\n${t(PRIVACY)}`,
    actions,
    suggestions: ['How am I doing?', 'What should I do today?'],
  };
}

function progress(profile: KapwaProfile): PersonalAnswer {
  const { sessions, now, goalMinutes } = profile;
  if (!sessions.length) {
    return {
      text: t('No sessions yet, and that’s fine: everyone starts at zero. Your daily goal is {minutes} minutes. Even three minutes today would be a good start.', {
        minutes: goalMinutes,
      }),
      actions: [{ type: 'session', id: 'free-your-mind' }, { type: 'page', href: '/profile', label: 'Open Profile' }],
      suggestions: ['I’m new to meditation', 'What should I do today?'],
    };
  }
  const totals = lifetimeTotals(sessions);
  const streak = currentStreak(sessions, new Date(now));
  const today = minutesToday(sessions, now);
  const week = Math.round(
    sessions.filter((session) => now - session.startedAt < 7 * DAY).reduce((total, session) => total + session.seconds, 0) / 60,
  );
  const goal =
    today >= goalMinutes
      ? t('You’ve met today’s goal of {goal} minutes, with {today}. Well done.', { goal: goalMinutes, today })
      : today > 0
        ? t('Today you’ve done {today} of your {goal} minutes.', { goal: goalMinutes, today })
        : t('You haven’t sat today yet; your goal is {goal} minutes.', { goal: goalMinutes });
  const streakLine = streak > 0 ? `${t('You’re on a {days}-day streak.', { days: streak })} ` : '';
  const totalsLine = t('This week: {week} minutes. In all: {sessions} sessions and {minutes} minutes.', {
    week,
    sessions: totals.sessions,
    minutes: totals.minutes,
  });
  return {
    text: `${streakLine}${goal} ${totalsLine}\n\n${t('Progress here isn’t a race; coming back is what counts.')}`,
    actions: [{ type: 'page', href: '/profile', label: 'See your chart' }],
    suggestions: ['What should I do today?', 'What did I do last time?'],
  };
}

function sleep(profile: KapwaProfile): PersonalAnswer {
  if (!profile.sleepLogs.length) {
    return {
      text: t('You haven’t logged any nights yet. In the Sleep tab you can note when you went to bed and woke up, and I can tell you how your nights are going.'),
      actions: [{ type: 'page', href: '/sleep', label: 'Open Sleep' }],
      suggestions: ['Help me fall asleep tonight', 'Help me build a night routine'],
    };
  }
  const summary = summariseSleep(profile.sleepLogs, new Date(profile.now), 7);
  const parts = [
    t(summary.nights === 1 ? 'You’ve logged {nights} night this past week.' : 'You’ve logged {nights} nights this past week.', {
      nights: summary.nights,
    }),
  ];
  if (summary.averageHours !== null) {
    parts.push(
      t('On average you slept about {hours} h {minutes} min.', {
        hours: Math.floor(summary.averageHours),
        minutes: Math.round((summary.averageHours % 1) * 60),
      }),
    );
  }
  if (summary.bedtime) parts.push(t('You usually went to bed around {time}.', { time: summary.bedtime }));
  return {
    text: parts.join(' '),
    actions: [{ type: 'page', href: '/sleep', label: 'Open Sleep' }],
    suggestions: ['Help me fall asleep tonight', 'Help me build a night routine'],
  };
}

function saved(profile: KapwaProfile): PersonalAnswer {
  const sessions = profile.favorites.filter((id) => getMeditation(id));
  const stories = profile.favoriteStories.filter((id) => getStory(id));
  if (!sessions.length && !stories.length) {
    return {
      text: t('You haven’t saved anything yet. Tap the heart on any session or story to keep it here.'),
      actions: [{ type: 'page', href: '/meditations', label: 'Browse meditations' }],
      suggestions: ['What should I do today?'],
    };
  }
  const sessionCount = t(sessions.length === 1 ? '{count} session' : '{count} sessions', { count: sessions.length });
  const storyCount = t(stories.length === 1 ? '{count} story' : '{count} stories', { count: stories.length });
  const counted = stories.length
    ? t('You’ve saved {sessions} and {stories}. Here are some:', { sessions: sessionCount, stories: storyCount })
    : t('You’ve saved {sessions}. Here are some:', { sessions: sessionCount });
  return {
    text: counted,
    actions: [
      ...sessions.slice(0, 3).map((id): KapwaAction => ({ type: 'session', id })),
      ...stories.slice(0, 1).map((id): KapwaAction => ({ type: 'story', id })),
      { type: 'page', href: '/favorites', label: 'All saved' },
    ],
    suggestions: ['What should I do today?'],
  };
}

function suggest(profile: KapwaProfile): PersonalAnswer {
  const hour = new Date(profile.now).getHours();
  const today = minutesToday(profile.sessions, profile.now);
  const played = profile.sessions.slice(0, 10).map((session) => session.meditationId);
  // From 8 pm, wind-down time.
  const night = hour >= 20 || hour < 4;
  const morning = hour >= 4 && hour < 11;
  const usual = favouriteCategory(profile.sessions);
  const categories: CategorySlug[] = night ? ['sleep'] : morning ? ['focus', 'breathing'] : usual ? [usual, 'relaxation'] : ['relaxation', 'focus'];
  const left = Math.max(3, profile.goalMinutes - today);
  const picks = suggestSessions({ categories, minutes: Math.min(left, 17), exclude: played, count: 2 });
  const reason = night
    ? t('It’s late, so something to help you wind down.')
    : morning
      ? t('It’s morning, so something to start the day clear.')
      : usual
        ? t('You often come back for {category}, so here’s something new in that.', { category: categoryWords(usual) })
        : t('Here’s something gentle to try.');
  const goal =
    today >= profile.goalMinutes
      ? t('You’ve already met today’s goal, so this is a bonus.')
      : t('About {minutes} minutes would meet today’s goal.', { minutes: left });
  return {
    text: `${reason} ${goal} ${t('I’ve left out what you played recently:')}`,
    actions: [...picks.map((session): KapwaAction => ({ type: 'session', id: session.id })), ...(night ? [{ type: 'yoga', id: 'bedtime-yoga' } as KapwaAction] : [])],
    suggestions: ['Something shorter', 'Show me breathing techniques'],
  };
}

/** The reply to a question about the reader, from their data. */
export function personalReply(intentId: string, profile: KapwaProfile): PersonalAnswer {
  switch (intentId.slice(PERSONAL_PREFIX.length)) {
    case 'who':
      return who(profile);
    case 'last':
      return last(profile);
    case 'progress':
      return progress(profile);
    case 'sleep':
      return sleep(profile);
    case 'saved':
      return saved(profile);
    default:
      return suggest(profile);
  }
}

/** What Kapwa says about the reader without reading their activity: only the name, which they gave the app to use. */
export function withoutActivity(profile: KapwaProfile | undefined): string {
  const name = profile?.name ? `${t('You’re {name}.', { name: profile.name })} ` : '';
  return `${name}${t('I’m not using your activity right now, so I can’t look at your sessions or screens. If you’d like me to, say “use my activity”. It stays on your phone.')}`;
}
