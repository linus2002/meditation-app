import { addDaysToKey } from '@/lib/circles/tz';
import type { InspirationReason } from '@/lib/inspiration';

/**
 * Which message belongs to which day, once decided.
 *
 * A day's message is settled the first time it is needed — scheduled as a
 * phone notification, delivered in the browser, or shown on the Notifications
 * screen — and from then on that day keeps it. So the notification and the
 * app always say the same thing, and logging a heavy reflection at 9 PM does
 * not rewrite the words someone already read at 8 AM.
 *
 * Future days stay open: they are re-decided on each launch, so they reflect
 * the reader as they are now, not as they were two weeks ago.
 */

export interface PlannedInspiration {
  id: string;
  reason: InspirationReason | null;
}

export type InspirationPlan = Record<string, PlannedInspiration>;

const PLAN_KEY = 'serenity.inspiration.plan.v1';

/** Enough history for the Notifications screen; older days are dropped. */
const KEEP_DAYS = 7;

/**
 * The message for `dateKey`: the one already settled if that day has come,
 * otherwise a fresh choice. Returns the updated plan; never mutates.
 */
export function planDay(
  plan: InspirationPlan,
  dateKey: string,
  todayKey: string,
  choose: () => PlannedInspiration,
): { entry: PlannedInspiration; plan: InspirationPlan } {
  const existing = plan[dateKey];
  if (existing && dateKey <= todayKey) return { entry: existing, plan };

  const entry = choose();
  return { entry, plan: { ...plan, [dateKey]: entry } };
}

export function prunePlan(plan: InspirationPlan, todayKey: string): InspirationPlan {
  const oldest = addDaysToKey(todayKey, -KEEP_DAYS);
  return Object.fromEntries(Object.entries(plan).filter(([dateKey]) => dateKey >= oldest));
}

export function readPlan(): InspirationPlan {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as InspirationPlan) : {};
  } catch {
    return {};
  }
}

export function writePlan(plan: InspirationPlan): void {
  try {
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    // Without storage each screen re-decides; the words may simply differ.
  }
}
