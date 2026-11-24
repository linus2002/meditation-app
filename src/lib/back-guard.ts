/**
 * Lets a screen answer Back itself while something must not be dropped by
 * accident: a timed sit (asks before ending), the assessment (goes back a
 * question rather than out with every answer).
 *
 * Android's Back button asks `runBackGuard` first (HardwareBack). A browser's
 * Back, and iOS's swipe, are a history step, so while a guard is up an extra
 * entry for the same screen sits on top. Back pops that entry, which changes
 * nothing on screen, and the guard decides what Back means. The entry copies
 * Next.js's own state: an entry it does not recognise makes it reload the page.
 */

const SENTINEL = '__serenityBackGuard';

type Guard = { onBack: () => void };

const guards: Guard[] = [];
/** Pops this module made itself, so they are not taken for the reader's Back. */
let ownPops = 0;
let listening = false;

function stateOf(): Record<string, unknown> {
  const state = window.history.state as unknown;
  return state && typeof state === 'object' ? (state as Record<string, unknown>) : {};
}

function ensureEntry(): void {
  if (stateOf()[SENTINEL]) return;
  window.history.pushState({ ...stateOf(), [SENTINEL]: true }, '', window.location.href);
}

function onPop(event: PopStateEvent): void {
  if (ownPops > 0) {
    ownPops -= 1;
    return;
  }
  const state = event.state as Record<string, unknown> | null;
  const top = guards[guards.length - 1];
  if (!top || state?.[SENTINEL]) return;
  top.onBack();
  // Still guarding: put the entry back for the next Back. After Next.js has
  // handled this same pop, so it is not undone.
  window.setTimeout(() => {
    if (guards.length > 0) ensureEntry();
  }, 0);
}

/** Puts a guard up, and returns the function that takes it down. */
export function registerBackGuard(onBack: () => void): () => void {
  const guard: Guard = { onBack };
  guards.push(guard);
  if (!listening) {
    listening = true;
    window.addEventListener('popstate', onPop);
  }
  ensureEntry();

  return () => {
    const index = guards.indexOf(guard);
    if (index < 0) return;
    guards.splice(index, 1);
    // Nothing left to guard: take the extra entry away, if still on top, so
    // the next Back is an ordinary one. Gone already if the screen was left.
    if (guards.length === 0 && stateOf()[SENTINEL]) {
      ownPops += 1;
      window.history.back();
    }
  };
}

/** Android's Back: true when a guard handled it. */
export function runBackGuard(): boolean {
  const top = guards[guards.length - 1];
  if (!top) return false;
  top.onBack();
  return true;
}
