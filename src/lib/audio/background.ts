/*
 * Keeps the native app alive with the screen off while something is under way,
 * and shows what is playing as a player card on the lock screen and in the
 * notification shade, with play, pause and (where it makes sense) seeking.
 *
 * Reached through the Capacitor bridge, like the other native plugins, so the web
 * bundle never carries it. It's the app's own plugin (BackgroundSoundPlugin.java)
 * and Android only: elsewhere this does nothing, and the session's freeze check
 * (freeze.ts) is what protects it.
 */

/** What the lock-screen card shows. Times are in seconds. */
export interface NowPlaying {
  /** The session, story or sound, e.g. "Open Heart" or "Rain". */
  title: string;
  /** What kind of sound it is, e.g. "Rain · Breath-paced meditation". */
  subtitle: string;
  /** An https image for the card; the app icon is used without one. */
  artwork?: string;
  /** Length, for the progress bar. Left out for sounds with no end. */
  duration?: number;
  position: number;
  playing: boolean;
  /** Whether the progress bar and the 10-second skips are offered. */
  canSeek: boolean;
}

export interface NowPlayingControls {
  onPlay: () => void;
  onPause: () => void;
  /** To a point in seconds. Needed when `canSeek` is set. */
  onSeek?: (seconds: number) => void;
  /** The live position, which the card's own copy only follows on changes. */
  position?: () => number;
}

type MediaAction = 'play' | 'pause' | 'seekto' | 'seekforward' | 'seekbackward';

interface NativeBackgroundSound {
  update(options: { holding: boolean; nowPlaying: NowPlaying | null }): Promise<void>;
  addListener(
    event: 'mediaAction',
    listener: (event: { action: MediaAction; position?: number }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void };
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { BackgroundSound?: NativeBackgroundSound };
}

function nativePlugin(): NativeBackgroundSound | null {
  if (typeof window === 'undefined') return null;
  const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!bridge?.isNativePlatform?.()) return null;
  return bridge.Plugins?.BackgroundSound ?? null;
}

/** Seconds the 10-second skip buttons move. */
const SKIP_SECONDS = 10;

let holds = 0;

interface Entry {
  priority: number;
  order: number;
  info: NowPlaying | null;
  controls: NowPlayingControls;
}
const entries = new Map<number, Entry>();
let nextId = 1;
let listening = false;
let lastSent = '';

/** The card to show: the highest priority, and the newest among equals. */
function shown(): Entry | null {
  let best: Entry | null = null;
  for (const entry of entries.values()) {
    if (!entry.info) continue;
    if (
      !best ||
      entry.priority > best.priority ||
      (entry.priority === best.priority && entry.order > best.order)
    ) {
      best = entry;
    }
  }
  return best;
}

function onAction(event: { action: MediaAction; position?: number }) {
  const entry = shown();
  if (!entry?.info) return;
  const { controls, info } = entry;
  const now = controls.position?.() ?? info.position;
  const clamp = (seconds: number) =>
    Math.max(0, info.duration ? Math.min(info.duration, seconds) : seconds);
  switch (event.action) {
    case 'play':
      controls.onPlay();
      break;
    case 'pause':
      controls.onPause();
      break;
    case 'seekto':
      if (info.canSeek && typeof event.position === 'number') controls.onSeek?.(clamp(event.position));
      break;
    case 'seekforward':
      if (info.canSeek) controls.onSeek?.(clamp(now + SKIP_SECONDS));
      break;
    case 'seekbackward':
      if (info.canSeek) controls.onSeek?.(clamp(now - SKIP_SECONDS));
      break;
  }
}

/** Sends the state to Android, once per change. */
function sync() {
  const plugin = nativePlugin();
  if (!plugin) return;
  if (!listening) {
    listening = true;
    try {
      void plugin.addListener('mediaAction', onAction);
    } catch {
      // An older app without the lock-screen controls: the card just has no buttons.
    }
  }
  const state = { holding: holds > 0, nowPlaying: shown()?.info ?? null };
  const key = JSON.stringify(state);
  if (key === lastSent) return;
  lastSent = key;
  void plugin.update(state).catch(() => {
    // Android refuses the service from the background. The app then simply has
    // no protection from being killed, as it had none before.
    lastSent = '';
  });
}

/**
 * Asks to stay alive, and returns the release. Holds overlap as one screen hands
 * over to another or a soundscape plays under a session, so the service runs
 * from the first hold to the last release (or while a card is still shown).
 */
export function holdBackground(): () => void {
  holds += 1;
  if (holds === 1) sync();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    if (holds === 0) sync();
  };
}

/**
 * Claims a place on the lock screen. A session outranks the soundscape playing
 * under it, so give screens a higher `priority` than the background sound.
 */
export function claimLockScreen(priority: number, controls: NowPlayingControls) {
  const id = nextId++;
  const entry: Entry = { priority, order: id, info: null, controls };
  entries.set(id, entry);
  return {
    /** What to show now; null hides it while keeping the claim. */
    show(info: NowPlaying | null, nextControls?: NowPlayingControls) {
      entry.info = info;
      if (nextControls) entry.controls = nextControls;
      sync();
    },
    release() {
      if (!entries.delete(id)) return;
      sync();
    },
  };
}

/** For tests: forget everything between cases. */
export function resetBackgroundForTests() {
  holds = 0;
  entries.clear();
  nextId = 1;
  listening = false;
  lastSent = '';
}
