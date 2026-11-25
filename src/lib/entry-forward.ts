/**
 * The native app answers every address it has no file for with the start page
 * (see `app/page.tsx`), which then forwards to the address it was asked for. If
 * that page isn't in the app (a session removed since a reminder or a mix
 * pointed at it), the forward fails, the router falls back to a full load, the
 * start page answers again, and the app reloads forever. These two checks stop
 * that.
 */

/** Whether the app's build has a page at `pathname`, judged by its route data file. */
export async function exportedPageExists(
  pathname: string,
  fetcher: (url: string) => Promise<{ ok: boolean }> = (url) => fetch(url, { cache: 'no-store' }),
): Promise<boolean> {
  const base = pathname.endsWith('/') ? pathname : `${pathname}/`;
  try {
    return (await fetcher(`${base}index.txt`)).ok;
  } catch {
    return false;
  }
}

/**
 * The address as the app's build names it. The phone's build stores each page
 * as `/home/index.txt`, so the router must be sent to `/home/`: asked for
 * `/home` it fetches `/home.txt`, which isn't there, reloads, lands back here,
 * and the loop guard then showed "This page isn't here". That was what
 * everyone saw after signing in, since sign-in reloads the app at `/home`.
 */
export function withTrailingSlash(pathname: string): string {
  if (pathname.endsWith('/')) return pathname;
  // A file (sw.js, a picture) keeps its name.
  if (/\.[a-z0-9]+$/i.test(pathname.slice(pathname.lastIndexOf('/') + 1))) return pathname;
  return `${pathname}/`;
}

const FORWARD_KEY = 'serenity.entry.forward.v1';
/** A second forward to the same place this soon means the first never arrived. */
export const FORWARD_LOOP_MS = 15_000;

interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Notes a forward to `path` and says whether it may go ahead: false if the
 * start page already forwarded there moments ago, which is a loop.
 */
export function allowForward(path: string, now: number, storage: Storage | null): boolean {
  if (!storage) return true;
  try {
    const last = JSON.parse(storage.getItem(FORWARD_KEY) ?? 'null') as { path?: unknown; at?: unknown } | null;
    if (last && last.path === path && typeof last.at === 'number' && now - last.at < FORWARD_LOOP_MS) {
      return false;
    }
    storage.setItem(FORWARD_KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Without storage the page check alone has to do.
  }
  return true;
}
