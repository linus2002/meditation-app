'use client';

/**
 * Saving a session to the device, and the honest limits of doing so.
 *
 * Worth being plain about what is and is not downloaded here, because it is not
 * what a music app would mean by the word. Serenity synthesises every sound at
 * runtime — the soundscapes are oscillators and noise buffers, the narration is
 * the device's own speech engine — so there is no audio file to fetch, and the
 * sound already works with no network at all.
 *
 * What does not survive a flight is everything around the sound: the page, the
 * JavaScript that runs it, and above all the artwork, which on the web build is
 * served from `/_next/image?...` and so was never covered by the precache. That
 * is what saving pins, into a cache the worker keeps across deploys.
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
 * `bundled` is the native case: a Capacitor build ships every file inside the
 * app, so there is nothing to save and nothing that could be missing.
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

export async function saveSession(id: string): Promise<void> {
  await requestPersistentStorage();
  await ask({ type: 'pin', id, route: `/player/${id}` }, PIN_TIMEOUT_MS);
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
