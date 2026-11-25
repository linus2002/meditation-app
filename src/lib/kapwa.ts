import {
  crisisFollowUpReply,
  crisisKeywords,
  crisisReply,
  kapwaFallback,
  kapwaIntents,
  medicalUrgentKeywords,
  medicalUrgentReply,
  type KapwaIntent,
  type KapwaReply,
} from '@/data/kapwa';
import { crisisPatterns, medicalUrgentPatterns } from '@/data/kapwa-safety';
import { editDistance } from '@/lib/edit-distance';
import { hasTranslation, tr, type KapwaLanguage } from '@/lib/kapwa-i18n';
import { enrichReply } from '@/lib/kapwa-knowledge';

/**
 * How Kapwa picks a reply. Pure, so it is tested directly.
 *
 * Keywords are matched as whole words or phrases, ignoring case and
 * punctuation: "CAN'T SLEEP!!" finds sleep, "stressed" finds stress, and
 * "hi" does not fire inside "this". Typos in longer words are forgiven
 * ("overthnking", "anxios", "lonly") and chat shorthand is read out ("cnt
 * slep tn"). Each keyword scores its number of words, so a phrase outweighs
 * a single word; the intent with the highest score wins, and ties go to the
 * one listed first. Anything about self-harm is checked
 * before all of it, then medical warning signs, so neither can ever be
 * answered with a meditation.
 */

/**
 * Hindi in Devanagari is spelled more than one way: "हूँ" and "हूं", "ज़्यादा"
 * and "ज्यादा". Read alike: chandrabindu as anusvara, nukta dropped, and the
 * invisible joiners some keyboards add removed. Latin accents go too.
 */
export function foldScripts(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-़ͯ‌‍]/g, '')
    .replace(/ँ/g, 'ं');
}

/** Anything but a letter or digit, in any script: English, Filipino and Hindi alike. */
const NOT_A_LETTER = /[^\p{L}\p{M}\p{N}]+/gu;
const NOT_A_LETTER_OR_APOSTROPHE = /[^\p{L}\p{M}\p{N}'\s]/gu;

/** Lower case, curly apostrophes straightened, other punctuation to spaces. */
export function normalise(text: string): string {
  return foldScripts(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(NOT_A_LETTER_OR_APOSTROPHE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contains(normalised: string, keyword: string): boolean {
  const phrase = normalise(keyword);
  if (!phrase) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(phrase)}(\\s|$)`).test(normalised);
}

/** The plainer form the safety patterns are read against. */
export function safetyText(text: string): string {
  return foldScripts(text)
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(NOT_A_LETTER, ' ')
    .trim()
    .replace(/\bwanna\b/g, 'want to')
    .replace(/\bwant 2\b/g, 'want to')
    .replace(/\bgonna\b/g, 'going to')
    .replace(/\bdo not\b/g, 'dont')
    .replace(/\bcan ?not\b/g, 'cant')
    .replace(/\bmy self\b/g, 'myself');
}

export type SafetyKind = 'crisis' | 'medical-urgent';

/** Whether a message has to be answered on the phone with a way to real help. */
export function safetyKind(message: string): SafetyKind | null {
  const text = normalise(message);
  const plain = safetyText(message);
  const found = (keywords: string[], patterns: RegExp[]) =>
    keywords.some((keyword) => contains(text, keyword)) || patterns.some((pattern) => pattern.test(plain));

  if (found(crisisKeywords, crisisPatterns)) return 'crisis';
  if (found(medicalUrgentKeywords, medicalUrgentPatterns)) return 'medical-urgent';
  return null;
}

/** How long after a safety message the chat keeps answering with care only. */
export const SAFETY_HOLD_MS = 30 * 60 * 1000;

interface FlaggedMessage {
  safety?: SafetyKind;
  at?: number;
}

/**
 * The risk a conversation is still in. "Yes, tonight" means nothing on its
 * own and everything straight after "I want to die", so for a while after a
 * safety message nothing typed is offered a session or sent to the AI. A
 * crisis outweighs a later medical sign. Clearing the chat ends it.
 */
export function safetyHold(messages: FlaggedMessage[], now: number): SafetyKind | null {
  const recent = messages.filter(
    (message) => message.safety && message.at !== undefined && now - message.at < SAFETY_HOLD_MS,
  );
  if (recent.some((message) => message.safety === 'crisis')) return 'crisis';
  return recent.length > 0 ? 'medical-urgent' : null;
}

/**
 * A crisis or medical reply in the reader's language. While the translations
 * are in beta, the English follows it, so the one reply that matters most
 * can't be lost to a clumsy translation. The numbers to call are buttons,
 * the same in every language.
 */
export function safetyReplyIn(reply: KapwaReply, lang: KapwaLanguage): KapwaReply {
  if (lang === 'en' || !hasTranslation(lang, reply.text)) return reply;
  return { ...reply, text: `${tr(lang, reply.text)}\n\n${tr(lang, 'In English:')}\n${reply.text}` };
}

/** The reply to a message typed during `safetyHold` that shows no new risk of its own. */
export function heldReply(kind: SafetyKind): KapwaReply {
  return kind === 'crisis' ? crisisFollowUpReply : medicalUrgentReply;
}

/**
 * The AI can notice risk the lists above missed. When its answer talks of
 * crisis lines or emergency help, it gets the numbers instead of sessions.
 */
export function replySignalsRisk(reply: string): boolean {
  return /suicid|self.harm|hotline|crisis line|emergency (services|room|number)|magpakamatay/i.test(reply);
}

/**
 * Chat shorthand, read as the words it stands for. Applied to keywords too,
 * so "I’m" in a keyword and "im" or "i m" typed both arrive as "i am".
 */
export const SHORTHAND: Record<string, string> = {
  u: 'you', ya: 'you', ur: 'your', yr: 'your', r: 'are', im: 'i am', ive: 'i have',
  idk: 'i dont know', dunno: 'dont know', rn: 'right now', atm: 'right now', tn: 'tonight',
  tonite: 'tonight', '2nite': 'tonight', '2night': 'tonight', nite: 'night', pls: 'please', plz: 'please',
  bc: 'because', bcoz: 'because', cuz: 'because', coz: 'because', ppl: 'people', abt: 'about',
  tmrw: 'tomorrow', tmr: 'tomorrow', tmrow: 'tomorrow', '2moro': 'tomorrow', '2morrow': 'tomorrow',
  thx: 'thanks', cnt: 'cant', cannot: 'cant', wont: 'will not', gonna: 'going to', wanna: 'want to',
  gotta: 'have to', smth: 'something', sth: 'something', bf: 'boyfriend', gf: 'girlfriend',
  min: 'minutes', mins: 'minutes', minute: 'minutes', hrs: 'hours', alot: 'a lot', feelin: 'feeling',
  nothin: 'nothing', everythin: 'everything', anythin: 'anything', mediation: 'meditation',
  wat: 'what', wut: 'what', y: 'why', hw: 'how', hlp: 'help', mysef: 'myself', myslef: 'myself',
  // Filipino text speak.
  di: 'hindi', hnd: 'hindi', hndi: 'hindi', nde: 'hindi', aq: 'ako', nmn: 'naman', kc: 'kasi',
  xa: 'siya', sya: 'siya', pde: 'pwede', pwd: 'pwede', lng: 'lang',
  // Hinglish: Hindi typed in English letters is spelled many ways.
  nhi: 'nahi', nahin: 'nahi', nai: 'nahi', nhin: 'nahi', muje: 'mujhe', mjhe: 'mujhe', mujhey: 'mujhe',
  bhot: 'bahut', bht: 'bahut', bohot: 'bahut', bahot: 'bahut', jyada: 'zyada', jada: 'zyada', zada: 'zyada',
  ziada: 'zyada', zyda: 'zyada', mai: 'main', hu: 'hoon', hun: 'hoon', hoo: 'hoon',
  rha: 'raha', rhi: 'rahi', rhe: 'rahe', kr: 'kar', krna: 'karna', kro: 'karo',
  // Devanagari "नहीं" is often typed without its nasal mark.
  नही: 'नहीं', नहि: 'नहीं',
};

/**
 * Real words one slip from a keyword ("tried" from tired, "sheep" from
 * sleep). Typed, they are taken as written, never as a typo.
 */
const NOT_TYPOS = new Set([
  'tried', 'along', 'sheep', 'steep', 'sleet', 'sleek', 'start', 'stars', 'store', 'storm', 'heard',
  'world', 'words', 'worse', 'worst', 'worth', 'later', 'water', 'quite', 'might', 'light', 'tight',
  'fight', 'sight', 'local', 'loner', 'lover', 'lovely', 'sadly', 'badly', 'madly', 'trust', 'there',
  'three', 'these', 'those', 'where', 'tears', 'fears', 'years', 'still', 'stroke', 'strike', 'sacred',
  'cared', 'bread', 'broad', 'piece', 'place', 'plane', 'relay', 'party', 'failed', 'filling', 'feeding',
  'found', 'round', 'sound', 'mood', 'moody', 'stay', 'stray', 'strong', 'wrong', 'drained', 'trained', 'time',
  'times',
]);

/**
 * Keywords never change, so each is prepared once and kept: a reply then
 * costs a few milliseconds even on a slow phone.
 */
const preparedKeywords = new Map<string, string[]>();
function keywordWords(keyword: string): string[] {
  let words = preparedKeywords.get(keyword);
  if (!words) {
    words = matchWords(keyword);
    preparedKeywords.set(keyword, words);
  }
  return words;
}

/** A message made ready for keyword matching: tidied, apostrophes gone, shorthand read out. */
export function matchWords(text: string): string[] {
  const plain = foldScripts(text)
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(NOT_A_LETTER, ' ')
    .replace(/\bcan not\b/g, 'cant')
    .replace(/\bi m\b/g, 'im')
    .trim();
  if (!plain) return [];
  return plain
    .split(' ')
    .flatMap((word) => (SHORTHAND[word] ?? word).split(' '))
    .filter(Boolean);
}

/**
 * Endings that keep a word's meaning: "stressed", "worrying", "sadly". Not any
 * letters at all, or "progressive" would be progress and "goodbye" good.
 */
const ENDINGS = new Set([
  's', 'es', 'd', 'ed', 'ing', 'ings', 'ly', 'er', 'ers', 'est', 'ness', 'ful', 'y', 'ies', 'ied', 'ment', 'ments', 'ion',
]);

/** A typed word as written (or with an ending added) counts in full; a near miss for less. */
const EXACT = 1;
const NEAR = 0.75;

function wordScore(keyword: string, typed: string): number {
  if (typed === keyword) return EXACT;
  // An ending added: "overthinking" for overthink, "stressed" for stress.
  if (keyword.length >= 4 && typed.startsWith(keyword) && ENDINGS.has(typed.slice(keyword.length))) return EXACT;
  // Typos only on longer words, and never the first letter.
  if (keyword.length < 5 || typed[0] !== keyword[0] || NOT_TYPOS.has(typed)) return 0;
  const allowed = keyword.length >= 8 ? 2 : 1;
  if (Math.abs(typed.length - keyword.length) <= allowed && editDistance(keyword, typed) <= allowed) return NEAR;
  // A slip and an ending together: "overthnking", "sleping".
  for (let length = keyword.length - 1; length <= keyword.length + 1; length++) {
    if (length > typed.length || (length < typed.length && !ENDINGS.has(typed.slice(length)))) continue;
    // A dropped letter only counts with an ending after it ("sleping"), or
    // "sucks" would read as "stuck".
    if (length < keyword.length && typed.length <= keyword.length) continue;
    if (editDistance(keyword, typed.slice(0, length)) <= allowed) return NEAR;
  }
  return 0;
}

/**
 * How strongly a message carries one keyword: 0 when it doesn't, otherwise
 * the number of words in the keyword, so "fall asleep" outweighs "sleep".
 * The words must come together and in order. Near misses count for less.
 */
export function keywordScore(words: string[], keyword: string): number {
  return keywordMatch(words, keywordWords(keyword))?.score ?? 0;
}

/** Where in the message a keyword's words were found, and how well. */
function keywordMatch(words: string[], parts: string[]): { start: number; score: number } | null {
  if (parts.length === 0 || parts.length > words.length) return null;
  let best: { start: number; score: number } | null = null;
  for (let start = 0; start + parts.length <= words.length; start++) {
    let total = 0;
    for (let i = 0; i < parts.length; i++) {
      const score = wordScore(parts[i], words[start + i]);
      if (score === 0) {
        total = 0;
        break;
      }
      total += score;
    }
    if (total > 0 && (!best || total > best.score)) best = { start, score: total };
    if (best?.score === parts.length) break;
  }
  return best;
}

/**
 * An intent's score for a message. Each typed word counts once, for the
 * longest keyword that takes it, so "cant sleep" is one two-word hit, not
 * that plus "sleep" again: an intent can't win just by listing a word in
 * several phrases.
 */
/** Words that turn the next feeling around: "not stressed", "don't feel sad". */
const NEGATIONS = new Set(['not', 'no', 'never', 'dont', 'didnt', 'isnt', 'arent', 'wasnt', 'werent', 'doesnt', 'hardly', 'nor']);
/** Words that may sit between a negation and the feeling: "not really stressed", "dont feel sad". */
const NEGATION_FILLER = new Set(['really', 'very', 'that', 'so', 'too', 'feel', 'feeling', 'am', 'at', 'all', 'even', 'being', 'getting']);
/**
 * Intents where a negation is the problem, not its absence: "not sleeping",
 * "never sleep well". Their keywords are never read as negated.
 */
const NEGATION_KEEPS = new Set([
  'sleep-tonight', 'tired-cant-sleep', 'active-mind-night', 'sleep', 'consistency', 'pretending-okay',
  // "never feel good enough", "don't feel worthy": the negation is the pain.
  'not-good-enough', 'appreciate-self', 'confidence', 'self-doubt',
]);

/** Whether the words just before `start` say the opposite: "not", or "not really", "dont feel". */
function negatedAt(words: string[], start: number): boolean {
  const before = words[start - 1];
  if (before && NEGATIONS.has(before)) return true;
  const twoBefore = words[start - 2];
  return Boolean(before && twoBefore && NEGATION_FILLER.has(before) && NEGATIONS.has(twoBefore));
}

interface IntentHits {
  score: number;
  /** Keywords found but negated ("not stressed"): counted here, not in `score`. */
  negated: number;
}

/**
 * An intent's score for a message. Each typed word counts once, for the
 * longest keyword that takes it, so "cant sleep" is one two-word hit, not
 * that plus "sleep" again: an intent can't win just by listing a word in
 * several phrases. A keyword right after a negation doesn't count.
 */
function hits(words: string[], intent: KapwaIntent): IntentHits {
  // Longest keywords first; among equals, the best match, so an exact
  // "heartbroken" isn't blocked by a near-miss "heartbreak" on the same word.
  const matches = intent.keywords
    .map((keyword) => {
      const parts = keywordWords(keyword);
      return { parts, found: keywordMatch(words, parts) };
    })
    .filter((match): match is { parts: string[]; found: { start: number; score: number } } => match.found !== null)
    .sort((a, b) => b.parts.length - a.parts.length || b.found.score - a.found.score);
  const taken = new Array<boolean>(words.length).fill(false);
  const result: IntentHits = { score: 0, negated: 0 };
  for (const { parts, found } of matches) {
    const span = taken.slice(found.start, found.start + parts.length);
    if (span.some(Boolean)) continue;
    span.forEach((_, i) => (taken[found.start + i] = true));
    if (!NEGATION_KEEPS.has(intent.id) && negatedAt(words, found.start)) result.negated += found.score;
    else result.score += found.score;
  }
  return result;
}

export interface RankedIntent {
  intent: KapwaIntent;
  /** One point per keyword word found; a near miss counts 0.75 a word. */
  score: number;
}

export interface Ranking {
  /** Best first; only intents with a score above 0. */
  ranked: RankedIntent[];
  /** Something was mentioned only to be denied: "I'm not stressed". */
  onlyNegated: boolean;
  wordCount: number;
}

/**
 * Every intent the message could mean, best first. Ties keep the order of
 * `kapwaIntents`, most specific first. Safety is not checked here.
 */
export function rankIntents(message: string, { supportTrack = false }: { supportTrack?: boolean } = {}): Ranking {
  const words = matchWords(message);
  const ranked: RankedIntent[] = [];
  let negated = 0;
  for (const intent of kapwaIntents) {
    if (intent.supportTrackOnly && !supportTrack) continue;
    const found = hits(words, intent);
    negated += found.negated;
    if (found.score > 0) ranked.push({ intent, score: found.score });
  }
  // A stable sort keeps the list order on ties.
  ranked.sort((a, b) => b.score - a.score);
  return { ranked, onlyNegated: ranked.length === 0 && negated > 0, wordCount: words.length };
}

/** Longer than this, a message is someone telling their story: the AI answers it, when it's on. */
export const PREPARED_MAX_WORDS = 30;

/** The reply an intent gives to a message: its text for this turn, its buttons, filled in for the message. */
export function answer(intent: KapwaIntent, message: string, { turn = 0, wordCount = 0 } = {}): KapwaReply {
  return enrichReply(
    {
      intentId: intent.id,
      text: intent.replies[Math.abs(turn) % intent.replies.length],
      actions: intent.actions ?? [],
      ...(intent.suggestions ? { suggestions: intent.suggestions } : {}),
      // A prepared answer is given in full, even with the AI on, when the
      // message is short enough to be a question rather than a story.
      ...(intent.prepared && wordCount <= PREPARED_MAX_WORDS ? { prepared: true } : {}),
    },
    message,
  );
}

/**
 * The single best reply to a message on its own, with no conversation
 * around it. The chat uses `converse` (lib/kapwa-dialogue), which builds on
 * this with what was said before.
 */
export function replyTo(
  message: string,
  { turn = 0, supportTrack = false }: { turn?: number; supportTrack?: boolean } = {},
): KapwaReply {
  const risk = safetyKind(message);
  if (risk === 'crisis') return crisisReply;
  if (risk === 'medical-urgent') return medicalUrgentReply;

  const { ranked, wordCount } = rankIntents(message, { supportTrack });
  const best = ranked[0]?.intent;
  if (!best) return kapwaFallback;
  return answer(best, message, { turn, wordCount });
}
