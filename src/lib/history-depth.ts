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
/** The browser's own replaceState, before the wrap: it writes a depth as given. */
let rawReplace: History['replaceState'] | null = null;

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
  rawReplace = replace;
  history.pushState = (data, unused, url) => push(withDepth(data, 'push', history.state), unused, url);
  history.replaceState = (data, unused, url) => replace(withDepth(data, 'replace', history.state), unused, url);
}

/** Whether Back stays inside the app. */
export function hasEarlierScreen(): boolean {
  return typeof window !== 'undefined' && depthOf(window.history.state) > 0;
}

/**
 * For a page reached by a full load from another screen of this app, which
 * starts with no depth: an address the app doesn't have is loaded afresh
 * rather than swapped in. Counts the screen it came from, so Back returns
 * there instead of going home. Only when the browser says it came from this
 * site, by a link rather than a reload, with an entry behind it.
 */
export function adoptEarlierScreen(): boolean {
  if (typeof window === 'undefined' || hasEarlierScreen() || window.history.length < 2) return false;
  let fromHere = false;
  try {
    fromHere = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
  } catch {
    fromHere = false;
  }
  const entry = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!fromHere || (entry && entry.type !== 'navigate')) return false;
  // Past the wrap, which would put a replace back at the current depth.
  const write = rawReplace ?? window.history.replaceState.bind(window.history);
  write(withDepth(window.history.state, 'push', window.history.state), '');
  return true;
}
