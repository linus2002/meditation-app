/**
 * The browser's offer to install the app (`beforeinstallprompt`), kept from
 * the moment the page loads.
 *
 * The offer fires once, soon after load, whatever screen is open. Listening
 * only from Profile missed it almost every time, so the Install row rarely
 * appeared. This starts listening as the app loads (see navigation-tracker)
 * and keeps the offer for Profile to use.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
let started = false;

/** One object per change, as useSyncExternalStore needs: a fresh one on every read loops. */
let snapshot: { deferred: BeforeInstallPromptEvent | null; installed: boolean } = { deferred: null, installed: false };

const notify = () => {
  snapshot = { deferred, installed };
  listeners.forEach((listener) => listener());
};

export function watchInstallPrompt(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function installOffer(): { deferred: BeforeInstallPromptEvent | null; installed: boolean } {
  return snapshot;
}

export function onInstallOfferChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The offer can be used once; after that the browser decides when to make another. */
export function spendOffer(): void {
  deferred = null;
  notify();
}

export function markInstalled(): void {
  installed = true;
  deferred = null;
  notify();
}
