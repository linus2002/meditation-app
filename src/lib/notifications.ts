'use client';

import {
  CIRCLE_REMINDER_LEAD_MS,
  circleReminderDue,
  reminderKey,
} from '@/lib/circles/schedule';
import type { Occurrence } from '@/lib/circles/types';
import {
  dayKey,
  isDue,
  reminderBody,
  reminderDefinitions,
  upcomingDaily,
  type ReminderDefinition,
} from '@/lib/reminders';

/**
 * Delivering the scheduled reminders, on whichever platform is underneath.
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

/** The last local date each reminder was delivered, keyed by reminder id. */
export function deliveredLog(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return readDelivered();
}

/**
 * Shows one notification now. Resolves true only if it was actually handed to
 * the browser.
 *
 * The service worker is the preferred route: its notifications survive the tab
 * closing and a tap is handled in `sw.js`. But the worker is only registered in
 * production, so without one this falls back to a page-level `Notification` -
 * otherwise development would mark reminders delivered that never appeared.
 * Chrome on Android refuses the constructor outright, hence the catch.
 */
async function displayWebNotification(
  title: string,
  options: { body: string; tag: string; url: string },
): Promise<boolean> {
  if (Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.showNotification(title, {
      body: options.body,
      tag: options.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: options.url },
    });
    return true;
  }

  try {
    const notification = new Notification(title, {
      body: options.body,
      tag: options.tag,
      icon: '/icons/icon-192.png',
    });
    notification.onclick = () => {
      window.focus();
      window.location.assign(options.url);
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * What a reminder says on a date. The daily inspiration is chosen per reader,
 * which only the app (not this module) knows how to do, so callers may pass
 * their own; otherwise each reminder says its own fixed words.
 */
export type BodyResolver = (reminder: ReminderDefinition, dateKey: string) => string;

function showWebNotification(reminder: ReminderDefinition, body: string): Promise<boolean> {
  return displayWebNotification(reminder.title, {
    body,
    tag: `serenity-${reminder.id}`,
    url: reminder.url,
  });
}

/**
 * Native id for the one-off test notification. Kept well clear of the
 * reminders' `nativeId`s so a test can never cancel or replace a real one.
 */
const TEST_NATIVE_ID = 99;

export type TestResult = 'sent' | 'blocked' | 'unsupported' | 'failed';

/**
 * Sends a notification right now, so a reader can see what a reminder looks
 * like and confirm this device will actually show one.
 */
export async function sendTestNotification(): Promise<TestResult> {
  const title = 'Serenity is set up';
  const body = 'This is what a reminder will look like.';

  const native = nativePlugin();
  if (native) {
    try {
      const { display } = await native.checkPermissions();
      if (display !== 'granted') return 'blocked';
      await native.schedule({
        notifications: [
          {
            id: TEST_NATIVE_ID,
            title,
            body,
            // A moment ahead rather than "now", which some OS versions drop.
            schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
            extra: { url: '/notifications' },
          },
        ],
      });
      return 'sent';
    } catch {
      return 'failed';
    }
  }

  if (!webNotificationsAvailable()) return 'unsupported';
  if (Notification.permission !== 'granted') return 'blocked';

  try {
    const shown = await displayWebNotification(title, {
      body,
      tag: 'serenity-test',
      url: '/notifications',
    });
    return shown ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Hands the whole schedule to the OS: one repeating daily notification per
 * enabled reminder, and a cancel for each one that is switched off.
 *
 * The schedule is rewritten rather than diffed. Repeating notifications are
 * cheap to re-register, and rewriting means a change of time or wording takes
 * effect on the next launch instead of living on in a stale pending entry.
 */
/** How many days of a daily-changing message are handed to the OS at once. */
const DAILY_MESSAGE_DAYS = 14;

/** The native ids a daily-changing reminder uses: `nativeId * 1000` onwards. */
function dailyNativeIds(entry: ReminderDefinition): number[] {
  return Array.from({ length: DAILY_MESSAGE_DAYS }, (_, index) => entry.nativeId * 1000 + index);
}

async function syncNative(enabledIds: string[], bodyOf: BodyResolver): Promise<void> {
  const native = nativePlugin();
  if (!native) return;

  const enabled = reminderDefinitions.filter((entry) => enabledIds.includes(entry.id));
  const disabled = reminderDefinitions.filter((entry) => !enabledIds.includes(entry.id));
  const daily = reminderDefinitions.filter((entry) => entry.bodyFor);

  try {
    // A message that changes every day cannot be one repeating notification,
    // so it is scheduled as the next fortnight of single days, each carrying
    // its own words — cleared and written fresh on every launch.
    const toCancel = [
      ...disabled.filter((entry) => !entry.bodyFor).map((entry) => entry.nativeId),
      ...daily.flatMap(dailyNativeIds),
    ];
    if (toCancel.length > 0) {
      await native.cancel({ notifications: toCancel.map((id) => ({ id })) });
    }

    const now = new Date();
    // Two shapes — one-off days and repeating rules — so typed as the plugin
    // takes them.
    const notifications = enabled.flatMap((entry): unknown[] => {
      if (entry.bodyFor) {
        const ids = dailyNativeIds(entry);
        return upcomingDaily(entry.time, now, DAILY_MESSAGE_DAYS).map((at, index) => ({
          id: ids[index],
          title: entry.title,
          body: bodyOf(entry, dayKey(at)),
          schedule: { at, allowWhileIdle: true },
          extra: { url: entry.url },
        }));
      }

      const [hour, minute] = entry.time.split(':').map(Number);
      return [
        {
          id: entry.nativeId,
          title: entry.title,
          body: entry.body,
          // `on` with only hour and minute set repeats every day at that time.
          schedule: { on: { hour, minute }, allowWhileIdle: true },
          extra: { url: entry.url },
        },
      ];
    });

    if (notifications.length > 0) await native.schedule({ notifications });
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
export function startReminders(enabledIds: string[], resolveBody?: BodyResolver): () => void {
  if (typeof window === 'undefined') return () => {};

  const bodyOf: BodyResolver = resolveBody ?? reminderBody;

  if (nativePlugin()) {
    void syncNative(enabledIds, bodyOf);
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
      void showWebNotification(reminder, bodyOf(reminder, dayKey(now)));
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

/* ------------------------------------------------------------------ *
 * Circle reminders
 *
 * One nudge, ten minutes before each session of a circle the reader belongs
 * to. Never after it has started, never about anyone else's activity, and
 * never about a streak.
 * ------------------------------------------------------------------ */

/**
 * Native ids reserved for circle reminders. The whole range is cancelled on
 * every sync, so slots can be reassigned freely without ever touching the
 * daily and bedtime reminders (ids 1 and 2) or the test (99).
 */
const CIRCLE_NATIVE_FIRST_ID = 1000;
const CIRCLE_NATIVE_SLOTS = 100;

const CIRCLE_REMINDED_KEY = 'serenity.circles.reminded.v1';

export interface CircleReminderSlot {
  circleId: string;
  circleName: string;
  occurrence: Occurrence;
}

function circleReminderCopy(slot: CircleReminderSlot) {
  const time = new Date(slot.occurrence.startsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return {
    title: `${slot.circleName} sits at ${time}`,
    body: 'The room opens in five minutes. Come as you are.',
    url: `/circles/view?id=${slot.circleId}`,
  };
}

function readReminded(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(CIRCLE_REMINDED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function markReminded(key: string, now: number): void {
  // Stamps older than two days can never match a future session; drop them.
  const kept = Object.fromEntries(
    Object.entries(readReminded()).filter(([, at]) => now - at < 2 * 86_400_000),
  );
  try {
    window.localStorage.setItem(CIRCLE_REMINDED_KEY, JSON.stringify({ ...kept, [key]: now }));
  } catch {
    // At worst a repeated nudge.
  }
}

/**
 * Rewrites the OS schedule: every circle slot cancelled, then one explicit
 * notification per upcoming session. Explicit dates rather than a repeating
 * rule, because the circle's zone may change its clocks on a different day
 * from the reader's.
 */
async function syncCircleNative(slots: CircleReminderSlot[]): Promise<void> {
  const native = nativePlugin();
  if (!native) return;

  try {
    await native.cancel({
      notifications: Array.from({ length: CIRCLE_NATIVE_SLOTS }, (_, index) => ({
        id: CIRCLE_NATIVE_FIRST_ID + index,
      })),
    });

    const now = Date.now();
    const notifications = slots
      .filter((slot) => slot.occurrence.startsAt - CIRCLE_REMINDER_LEAD_MS > now)
      .slice(0, CIRCLE_NATIVE_SLOTS)
      .map((slot, index) => {
        const copy = circleReminderCopy(slot);
        return {
          id: CIRCLE_NATIVE_FIRST_ID + index,
          title: copy.title,
          body: copy.body,
          schedule: {
            at: new Date(slot.occurrence.startsAt - CIRCLE_REMINDER_LEAD_MS),
            allowWhileIdle: true,
          },
          extra: { url: copy.url },
        };
      });

    if (notifications.length > 0) await native.schedule({ notifications });
  } catch {
    // Without the plugin there are simply no circle reminders.
  }
}

/**
 * Starts circle reminders and returns the teardown. `getSlots` is called fresh
 * on every check, so it always reflects the reader's current circles.
 *
 * Pass a function returning nothing to clear them.
 */
export function startCircleReminders(getSlots: () => CircleReminderSlot[]): () => void {
  if (typeof window === 'undefined') return () => {};

  if (nativePlugin()) {
    void syncCircleNative(getSlots());
    return () => {};
  }

  if (!webNotificationsAvailable()) return () => {};

  let stopped = false;

  const tick = () => {
    if (stopped || Notification.permission !== 'granted') return;

    const now = Date.now();
    const reminded = readReminded();

    for (const slot of getSlots()) {
      const key = reminderKey(slot.circleId, slot.occurrence);
      if (!circleReminderDue(slot.occurrence, now, key in reminded)) continue;

      markReminded(key, now);
      const copy = circleReminderCopy(slot);
      void displayWebNotification(copy.title, {
        body: copy.body,
        tag: `serenity-circle-${slot.circleId}`,
        url: copy.url,
      });
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
