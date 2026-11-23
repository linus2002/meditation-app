/**
 * How many screens deep into this visit the current history entry is, kept in
 * the entry's own state so it survives a reload and Back/Forward.
 *
 * Counting screen changes cannot tell a push from a replace: open the app (one
 * replace to /home), switch tabs (another replace), and a counter says there
 * is somewhere to go back to when there is not, so Back does nothing.
 */

const KEY = '__serenityDepth';

type Kind = 'push' | 'replace';

export function depthOf(state: unknown): number {
  const value = state && typeof state === 'object' ? (state as Record<string, unknown>)[KEY] : undefined;
  return typeof value === 'number' && value >= 0 ? value : 0;
}

/** The state to store for a new entry, given the entry it follows or replaces. */
export function withDepth(data: unknown, kind: Kind, current: unknown): Record<string, unknown> {
  const base = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const depth = depthOf(current) + (kind === 'push' ? 1 : 0);
  return { ...base, [KEY]: depth };
}

let installed = false;

/**
 * Wraps the History API so every entry carries its depth. Next.js's own
 * router goes through these same two calls, so its state is kept as it is.
 */
export function trackHistoryDepth(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const { history } = window;
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (data, unused, url) => push(withDepth(data, 'push', history.state), unused, url);
  history.replaceState = (data, unused, url) => replace(withDepth(data, 'replace', history.state), unused, url);
}

/** Whether Back stays inside the app. */
export function hasEarlierScreen(): boolean {
  return typeof window !== 'undefined' && depthOf(window.history.state) > 0;
}
