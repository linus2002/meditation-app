'use client';

import { dayKey, isDue, reminderDefinitions, type ReminderDefinition } from '@/lib/reminders';

/**
 * Delivering the two reminders, on whichever platform is underneath.
 *
 * There are two very different backends here, and the difference decides what
 * the app may honestly promise:
 *
 * - **Native** (a Capacitor build): the OS holds the schedule. Reminders arrive
 *   at 07:00 whether or not the app has been opened for a week.
 * - **Web**: there is no push server behind this app, so nothing can wake it.
 *   Reminders are delivered by a ticker that runs while Serenity is open.
 *
 * `deliveryMode()` reports which one is in play, and the profile screen says so
 * rather than letting a web reader believe a closed tab will nudge them.
 */

/** Per-reminder record of the last local date delivered, so it fires once a day. */
const DELIVERED_KEY = 'serenity.reminders.delivered.v1';

/** How often the web ticker looks for a due reminder. */
const TICK_MS = 30 * 1000;

export type DeliveryMode = 'native' | 'web' | 'unsupported';
export type PermissionState = 'granted' | 'denied' | 'prompt';

/*
 * The native side is reached through the Capacitor bridge rather than an import
 * of the local-notifications package.
 *
 * That keeps the plugin out of the web bundle, where its schedule() is not
 * implemented anyway, and keeps the browser build from depending on a package
 * that only means anything inside a native shell. Installing the plugin and
 * running `cap sync` is what makes this branch light up - see MOBILE.md.
 */
interface NativePermission {
  display: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

interface NativeNotifications {
  checkPermissions(): Promise<NativePermission>;
  requestPermissions(): Promise<NativePermission>;
  schedule(options: { notifications: unknown[] }): Promise<unknown>;
  cancel(options: { notifications: { id: number }[] }): Promise<unknown>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { LocalNotifications?: NativeNotifications };
}

function nativePlugin(): NativeNotifications | null {
  if (typeof window === 'undefined') return null;

  const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!bridge?.isNativePlatform?.()) return null;

  return bridge.Plugins?.LocalNotifications ?? null;
}

function webNotificationsAvailable(): boolean {
  return (
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
  );
}

export function deliveryMode(): DeliveryMode {
  if (nativePlugin()) return 'native';
  if (webNotificationsAvailable()) return 'web';
  return 'unsupported';
}

function toPermissionState(display: NativePermission['display']): PermissionState {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'denied';
  return 'prompt';
}

export async function checkPermission(): Promise<PermissionState> {
  const native = nativePlugin();
  if (native) {
    try {
      return toPermissionState((await native.checkPermissions()).display);
    } catch {
      return 'prompt';
    }
  }

  if (!webNotificationsAvailable()) return 'denied';

  const permission = Notification.permission;
  return permission === 'default' ? 'prompt' : permission;
}

/**
 * Asks for permission, returning what the reader chose.
 *
 * Safe to call when already granted or already denied - both the browser and
 * the native layer answer from the existing decision instead of prompting a
 * second time, and a denial stands until it is changed in system settings.
 */
export async function requestPermission(): Promise<PermissionState> {
  const native = nativePlugin();
  if (native) {
    try {
      return toPermissionState((await native.requestPermissions()).display);
    } catch {
      return 'denied';
    }
  }

  if (!webNotificationsAvailable()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    return permission === 'default' ? 'prompt' : permission;
  } catch {
    return 'denied';
  }
}

function readDelivered(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(DELIVERED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function markDelivered(id: string, key: string): void {
  try {
    window.localStorage.setItem(DELIVERED_KEY, JSON.stringify({ ...readDelivered(), [id]: key }));
  } catch {
    // Losing the stamp risks a repeated nudge, never a missed one.
  }
}

/** Shows one notification now, through the service worker registration. */
async function showWebNotification(reminder: ReminderDefinition): Promise<void> {
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  await registration.showNotification(reminder.title, {
    body: reminder.body,
    tag: `serenity-${reminder.id}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: reminder.url },
  });
}

/**
 * Hands the whole schedule to the OS: one repeating daily notification per
 * enabled reminder, and a cancel for each one that is switched off.
 *
 * The schedule is rewritten rather than diffed. Repeating notifications are
 * cheap to re-register, and rewriting means a change of time or wording takes
 * effect on the next launch instead of living on in a stale pending entry.
 */
async function syncNative(enabledIds: string[]): Promise<void> {
  const native = nativePlugin();
  if (!native) return;

  const enabled = reminderDefinitions.filter((entry) => enabledIds.includes(entry.id));
  const disabled = reminderDefinitions.filter((entry) => !enabledIds.includes(entry.id));

  try {
    if (disabled.length > 0) {
      await native.cancel({ notifications: disabled.map((entry) => ({ id: entry.nativeId })) });
    }

    if (enabled.length === 0) return;

    await native.schedule({
      notifications: enabled.map((entry) => {
        const [hour, minute] = entry.time.split(':').map(Number);
        return {
          id: entry.nativeId,
          title: entry.title,
          body: entry.body,
          // `on` with only hour and minute set repeats every day at that time.
          schedule: { on: { hour, minute }, allowWhileIdle: true },
          extra: { url: entry.url },
        };
      }),
    });
  } catch {
    // A shell without the plugin installed simply has no reminders, and the
    // app works exactly as it did before.
  }
}

/**
 * Starts delivering the given reminders, and returns the teardown.
 *
 * On native this is a one-shot handoff to the OS. On the web it is a ticker:
 * every thirty seconds, and whenever the app returns to the foreground, it
 * looks for a reminder whose time has passed today and has not been delivered.
 *
 * A ticker rather than one long `setTimeout`, because a browser will happily
 * throttle, suspend or drop a timer set fourteen hours into the future, and
 * because this way the check also survives the app being closed and reopened.
 */
export function startReminders(enabledIds: string[]): () => void {
  if (typeof window === 'undefined') return () => {};

  if (nativePlugin()) {
    void syncNative(enabledIds);
    return () => {};
  }

  if (!webNotificationsAvailable() || enabledIds.length === 0) return () => {};

  const enabled = reminderDefinitions.filter((entry) => enabledIds.includes(entry.id));
  let stopped = false;

  const tick = () => {
    if (stopped || Notification.permission !== 'granted') return;

    const now = new Date();
    const delivered = readDelivered();

    for (const reminder of enabled) {
      if (!isDue(reminder, now, delivered[reminder.id])) continue;
      markDelivered(reminder.id, dayKey(now));
      void showWebNotification(reminder);
    }
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };

  tick();
  const timer = window.setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
