import type { SupportAppointment } from '@/lib/support-appointments';

/**
 * The support track's private record: what was listened to, whether text is
 * shown larger, and any appointment dates the reader added.
 *
 * Kept apart from the app's own session history on purpose. Nothing here
 * feeds the streak, the activity screen, the daily goal or a Circle — the
 * track tracks nothing that could read as falling behind during a hospital
 * week. It is for the reader's own reference only, and never leaves the phone.
 */

export interface SupportListen {
  sessionId: string;
  /** Epoch ms the listen began. */
  startedAt: number;
  /** Seconds actually listened, across any "keep going" extensions. */
  seconds: number;
}

export interface SupportState {
  largeText: boolean;
  /** Newest first. */
  history: SupportListen[];
  /** Dates the reader added under "My appointments". */
  appointments: SupportAppointment[];
}

const STORAGE_KEY = 'serenity.support.v1';

export const MAX_HISTORY = 50;

/** Shorter than this is a tap-and-leave, not a listen. */
export const MIN_LISTEN_SECONDS = 30;

/** Adds or updates a listen (keyed by session and start), newest first. */
export function addListen(history: SupportListen[], listen: SupportListen): SupportListen[] {
  if (listen.seconds < MIN_LISTEN_SECONDS) return history;

  return [
    listen,
    ...history.filter(
      (entry) => !(entry.sessionId === listen.sessionId && entry.startedAt === listen.startedAt),
    ),
  ]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_HISTORY);
}

export const emptySupportState: SupportState = { largeText: false, history: [], appointments: [] };

export function readSupport(): SupportState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySupportState;
    const parsed = JSON.parse(raw) as Partial<SupportState>;
    return {
      largeText: Boolean(parsed.largeText),
      history: parsed.history ?? [],
      appointments: parsed.appointments ?? [],
    };
  } catch {
    return emptySupportState;
  }
}

export function writeSupport(state: SupportState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private reference only; losing it costs nothing that matters.
  }
}
