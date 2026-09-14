import {
  crisisKeywords,
  crisisReply,
  kapwaFallback,
  kapwaIntents,
  type KapwaIntent,
  type KapwaReply,
} from '@/data/kapwa';

/**
 * How Kapwa picks a reply. Pure, so it is tested directly.
 *
 * Keywords are matched as whole words or phrases, ignoring case and
 * punctuation: "CAN'T SLEEP!!" finds sleep, "stressed" finds stress, and
 * "hi" does not fire inside "this". The intent with the most keyword hits
 * wins; ties go to the one listed first. Anything about self-harm is checked
 * before all of it.
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

function hits(normalised: string, intent: KapwaIntent): number {
  return intent.keywords.filter((keyword) => contains(normalised, keyword)).length;
}

export function replyTo(
  message: string,
  { turn = 0, supportTrack = false }: { turn?: number; supportTrack?: boolean } = {},
): KapwaReply {
  const text = normalise(message);
  if (!text) return kapwaFallback;

  if (crisisKeywords.some((keyword) => contains(text, keyword))) return crisisReply;

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
