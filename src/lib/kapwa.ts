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

/**
 * How Kapwa picks a reply. Pure, so it is tested directly.
 *
 * Keywords are matched as whole words or phrases, ignoring case and
 * punctuation: "CAN'T SLEEP!!" finds sleep, "stressed" finds stress, and
 * "hi" does not fire inside "this". The intent with the most keyword hits
 * wins; ties go to the one listed first. Anything about self-harm is checked
 * before all of it, then medical warning signs, so neither can ever be
 * answered with a meditation.
 */

/** Lower case, curly apostrophes straightened, other punctuation to spaces. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
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
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
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

function hits(normalised: string, intent: KapwaIntent): number {
  return intent.keywords.filter((keyword) => contains(normalised, keyword)).length;
}

export function replyTo(
  message: string,
  { turn = 0, supportTrack = false }: { turn?: number; supportTrack?: boolean } = {},
): KapwaReply {
  const risk = safetyKind(message);
  if (risk === 'crisis') return crisisReply;
  if (risk === 'medical-urgent') return medicalUrgentReply;

  const text = normalise(message);
  if (!text) return kapwaFallback;

  let best: KapwaIntent | null = null;
  let bestHits = 0;
  for (const intent of kapwaIntents) {
    if (intent.supportTrackOnly && !supportTrack) continue;
    const count = hits(text, intent);
    if (count > bestHits) {
      best = intent;
      bestHits = count;
    }
  }

  if (!best) return kapwaFallback;

  return {
    intentId: best.id,
    text: best.replies[Math.abs(turn) % best.replies.length],
    actions: best.actions ?? [],
  };
}
