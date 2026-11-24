import { personalKey } from '@/lib/account-scope';
import { addDays, fromDateKey, toDateKey } from '@/lib/date';

/**
 * Which stories were heard to the end, by day: enough for the calendar to mark
 * a scheduled story Done. Kept apart from the session history on purpose:
 * stories are for drifting off, and don't count towards streaks or mindful
 * minutes. On this phone only.
 */

const KEY = 'serenity.storiesFinished.v1';
/** A calendar looks back this far; older days are dropped. */
const KEEP_DAYS = 62;

export type StoryFinishes = Record<string, string[]>;

export function withStoryFinished(log: StoryFinishes, dateKey: string, storyId: string): StoryFinishes {
  const oldest = toDateKey(addDays(fromDateKey(dateKey), -KEEP_DAYS));
  const kept = Object.fromEntries(Object.entries(log).filter(([day]) => day >= oldest));
  const day = kept[dateKey] ?? [];
  return { ...kept, [dateKey]: day.includes(storyId) ? day : [...day, storyId] };
}

export function readStoryFinishes(): StoryFinishes {
  try {
    const raw = window.localStorage.getItem(personalKey(KEY));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as StoryFinishes) : {};
  } catch {
    return {};
  }
}

export function recordStoryFinished(storyId: string, at = new Date()): void {
  try {
    window.localStorage.setItem(personalKey(KEY), JSON.stringify(withStoryFinished(readStoryFinishes(), toDateKey(at), storyId)));
  } catch {
    // The calendar simply won't tick it.
  }
}
