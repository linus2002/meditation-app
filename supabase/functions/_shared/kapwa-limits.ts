/**
 * Who a Kapwa message counts against. Plain TypeScript, no Deno APIs, so the
 * app's tests cover it.
 */

/** A positive whole number from the environment, or the fallback: never "no limit". */
export function parseLimit(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * The quotas one message is taken from: the sender's own, and everyone's
 * together (the ceiling on the whole bill).
 *
 * An anonymous account (the kind video likes create) costs nothing to make,
 * so a fresh one per message would mean a fresh quota per message. It counts
 * by address instead, as someone with no account does.
 */
export function quotaSubjects({
  userId,
  anonymous,
  ipHash,
}: {
  userId: string | null;
  anonymous: boolean;
  ipHash: string;
}): string[] {
  return [userId && !anonymous ? `user:${userId}` : `ip:${ipHash}`, 'global'];
}
