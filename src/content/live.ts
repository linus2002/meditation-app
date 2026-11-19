import { bundledContent, isUsableContent, replaceContent, type Content } from '@/content';
import { fetchContent } from '@/content/sanity-content.mjs';

/**
 * Content edits in Sanity reaching installed apps without a new build.
 *
 * The app ships with a copy of the content (content.json, pulled at build
 * time). Once running it asks Sanity for the current published content and
 * keeps the answer on the phone, so the next launch starts from it even when
 * offline. A newer build's own copy always wins over an older stored one.
 */

const STORAGE_KEY = 'serenity.content.v1';

/** Two copies are the same when everything but the fetch time matches. */
function fingerprint(value: Content): string {
  const { pulledAt: _ignored, ...rest } = value;
  return JSON.stringify(rest);
}

const time = (value: Content) => Date.parse(value.pulledAt ?? '') || 0;

/** The raw copy (before any filtering for this build) the app is showing now. */
let shown: Content = bundledContent;

/** Shows a copy, and remembers it as the one on screen. False when it could not be used. */
export function showContent(value: Content): boolean {
  if (!replaceContent(value)) return false;
  shown = value;
  return true;
}

/** The copy kept from the last fetch, when it is usable and newer than this build's own. */
export function storedContent(): Content | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isUsableContent(value) || time(value) <= time(bundledContent)) return null;
    return value;
  } catch {
    return null;
  }
}

function store(value: Content): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the fresh copy is still used for this run.
  }
}

/**
 * Fetches the current content from Sanity and keeps it. Resolves to the fresh
 * copy when it differs from what the app is showing, and to null when nothing
 * changed or Sanity could not be reached (offline, blocked, or a bad answer).
 */
export async function fetchLatest(): Promise<Content | null> {
  try {
    const fresh = await fetchContent({ cache: 'no-store' });
    if (!isUsableContent(fresh)) return null;
    store(fresh);
    return fingerprint(fresh) === fingerprint(shown) ? null : fresh;
  } catch {
    return null;
  }
}

/** Whether a copy differs from what the app is showing now. */
export function differsFromCurrent(value: Content): boolean {
  return fingerprint(value) !== fingerprint(shown);
}
