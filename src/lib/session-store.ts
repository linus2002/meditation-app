import type { SessionRecord } from '@/types';

/** The most sittings kept on the phone. */
export const MAX_SESSIONS = 2000;

/** The history with this sitting in it: newest first, one copy per id. */
export function withSession(sessions: SessionRecord[], record: SessionRecord): SessionRecord[] {
  return [record, ...sessions.filter((item) => item.id !== record.id)].slice(0, MAX_SESSIONS);
}

/**
 * Writes a sitting to storage before returning.
 *
 * The provider normally saves state in an effect, and React runs no effects
 * once a page is unloading, so a sitting flushed on `pagehide` was never
 * written. This edits what is stored and leaves every other field as it is;
 * the effect writes the same sitting again whenever it next gets to run.
 */
export function saveSessionNow(
  store: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  record: SessionRecord,
): void {
  try {
    const state = JSON.parse(store.getItem(key) ?? '{}') as { sessions?: SessionRecord[] };
    store.setItem(key, JSON.stringify({ ...state, sessions: withSession(state.sessions ?? [], record) }));
  } catch {
    // Blocked or full storage: the sitting still counts for this visit.
  }
}
