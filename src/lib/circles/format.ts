import { toDateKey } from '@/lib/date';
import type { CircleGoal } from '@/lib/circles/types';

/**
 * Words for times and schedules on the Circles screens. Clock times are shown
 * in the reader's own zone and locale; the circle's zone never appears.
 */

export const goalLabels: Record<CircleGoal, string> = {
  calm: 'For calmer days',
  sleep: 'For better sleep',
  focus: 'For a clearer head',
  habit: 'For building the habit',
};

/** "in 12 min", "in 3h 20m". */
export function formatCountdown(ms: number): string {
  if (ms <= 60_000) return 'in under a minute';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`;
}

/** "just now", "12 min ago", "3h ago", "yesterday", "4 days ago". */
export function formatAgo(ms: number): string {
  if (ms < 60_000) return 'just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** ISO weekdays as a reader would say them: "Every day", "Weekdays", "Mon, Wed". */
export function describeDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '6,7') return 'Weekends';
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return sorted.map((day) => names[day - 1]).join(', ');
}

/** A clock time in the reader's zone and locale, e.g. "7:30 AM" or "07:30". */
export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Today", "Tomorrow" or a weekday, in the reader's own calendar. */
export function sessionDayLabel(startsAt: number, now: number): string {
  const day = toDateKey(new Date(startsAt));
  if (day === toDateKey(new Date(now))) return 'Today';
  if (day === toDateKey(new Date(now + 86_400_000))) return 'Tomorrow';
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: 'long' });
}

/** `m:ss`, for time left in the room. */
export function formatMinutesSeconds(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
