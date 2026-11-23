'use client';

/**
 * Saving a session to the device.
 *
 * A session is its page, the JavaScript that runs it, its artwork and, for most
 * sessions, a recording streamed from Sanity's CDN. The soundscapes underneath
 * are synthesised, so they need nothing. The worker reads the page and code
 * from the HTML; the artwork (drawn after the page loads, from
 * `/_next/image?...`) and the recording are not in it, so the player names them
 * here. All of it goes into a cache the worker keeps across deploys, and a save
 * that can't fetch every part fails rather than claim a copy that won't play.
 */

export interface SavedSession {
  id: string;
  bytes: number;
  /** Epoch milliseconds. */
  savedAt: number;
}

export interface DownloadsStatus {
  sessions: SavedSession[];
  bytes: number;
}

/**
 * `bundled` is the native case: a Capacitor build ships its pages and code
 * inside the app, so there is nothing to save. Artwork streams from Sanity and
 * is kept by the WebView's HTTP cache once seen; offline before that, each
 * image shows its blur preview.
 */
export type DownloadsSupport = 'available' | 'bundled' | 'unavailable';

/** How long to wait on the worker. Saving pulls over the network; the rest is local. */
const PIN_TIMEOUT_MS = 90 * 1000;
const QUERY_TIMEOUT_MS = 10 * 1000;

function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(bridge?.isNativePlatform?.());
}

export function downloadsSupport(): DownloadsSupport {
  if (typeof window === 'undefined') return 'unavailable';
  if (isNativeShell()) return 'bundled';
  if (!('serviceWorker' in navigator) || !('caches' in window)) return 'unavailable';
  return 'available';
}

/**
 * Sends one request to the worker and waits for the answer on a private port.
 *
 * `navigator.serviceWorker.ready` rather than `.controller`, because a page
 * loaded before the worker claimed it has no controller yet — and that is
 * exactly the first visit on which someone might tap save.
 */
async function ask<T>(message: Record<string, unknown>, timeoutMs: number): Promise<T> {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error('The offline worker is not running yet.');

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();

    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('The offline worker did not answer.'));
    }, timeoutMs);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();

      const data = event.data as { ok?: boolean; error?: string };
      if (data && data.ok) resolve(data as T);
      else reject(new Error((data && data.error) || 'The save did not complete.'));
    };

    worker.postMessage(message, [channel.port2]);
  });
}

/**
 * Asks the browser to treat this origin's storage as persistent.
 *
 * Without it a saved session lives in best-effort storage, which a browser is
 * free to evict when the device runs short — the one moment it must not. The
 * request is quiet: browsers grant or refuse it on their own criteria, usually
 * granting for an installed app, and a refusal costs nothing but eviction risk.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Every address the browser may fetch for these artworks on this screen: each
 * `srcset` candidate, since the device picks by pixel density and a variant
 * missing offline is a blank frame. Matched by the image's file name, which is
 * Sanity's content hash, inside the optimiser's `url=` parameter.
 */
export function artworkOnPage(sources: string[]): string[] {
  if (typeof document === 'undefined') return [];
  const names = sources
    .map((src) => src.split('?')[0].split('/').pop())
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return [];

  const found = new Set<string>();
  for (const img of Array.from(document.images)) {
    const candidates = [img.currentSrc, img.getAttribute('src') ?? '']
      .concat((img.getAttribute('srcset') ?? '').split(',').map((part) => part.trim().split(/\s+/)[0]));
    for (const candidate of candidates) {
      if (!candidate) continue;
      let url: URL;
      try {
        url = new URL(candidate, window.location.href);
      } catch {
        continue;
      }
      if (url.origin !== window.location.origin || url.pathname !== '/_next/image') continue;
      const inner = url.searchParams.get('url') ?? '';
      if (names.some((name) => inner.includes(name))) found.add(url.pathname + url.search);
    }
  }
  return [...found];
}

/** `media`: the recording and artwork addresses the session needs beyond its page. */
export async function saveSession(id: string, media: string[] = []): Promise<void> {
  await requestPersistentStorage();
  await ask({ type: 'pin', id, route: `/player/${id}`, media }, PIN_TIMEOUT_MS);
}

export async function removeSession(id: string): Promise<void> {
  await ask({ type: 'unpin', id }, QUERY_TIMEOUT_MS);
}

export async function readStatus(): Promise<DownloadsStatus> {
  const result = await ask<DownloadsStatus>({ type: 'pinned-status' }, QUERY_TIMEOUT_MS);
  return { sessions: result.sessions ?? [], bytes: result.bytes ?? 0 };
}

/** `4.2 MB`. Whole megabytes above ten, so the number stops twitching. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';

  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return '<0.1 MB';
  if (mb < 10) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}
