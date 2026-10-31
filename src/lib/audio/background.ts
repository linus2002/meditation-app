/*
 * Keeps the native app alive with the screen off while something is under way.
 *
 * Reached through the Capacitor bridge, like the other native plugins, so the web
 * bundle never carries it. It's the app's own plugin (BackgroundSoundPlugin.java)
 * and Android only: elsewhere this does nothing, and the session's freeze check
 * (freeze.ts) is what protects it.
 */
interface NativeBackgroundSound {
  start(): Promise<void>;
  stop(): Promise<void>;
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

let holds = 0;

/**
 * Asks to stay alive, and returns the release. Holds overlap as one screen hands
 * over to another or a soundscape plays under a session, so the service runs
 * from the first hold to the last release.
 */
export function holdBackground(): () => void {
  holds += 1;
  if (holds === 1) void nativePlugin()?.start().catch(() => {});

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    if (holds === 0) void nativePlugin()?.stop().catch(() => {});
  };
}
