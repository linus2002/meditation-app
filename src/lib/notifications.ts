'use client';

import {
  dayKey,
  isDue,
  reminderBody,
  reminderDefinitions,
  tappedUrl,
  upcomingDaily,
  type ReminderDefinition,
} from '@/lib/reminders';
import { isScheduleDue, upcomingOccurrences, type ScheduledSession } from '@/lib/schedule';

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
  // The bridge hands back the handle itself where the plugin's own wrapper
  // would hand back a promise of it.
  addListener(
    event: 'localNotificationActionPerformed',
    handler: (action: unknown) => void,
  ): NativeListener | Promise<NativeListener>;
}

interface NativeListener {
  remove(): Promise<void>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { LocalNotifications?: NativeNotifications };
}

function capacitorBridge(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
}

/** True inside the installed Android or iOS app, with or without the plugin. */
export function isNativeShell(): boolean {
  return Boolean(capacitorBridge()?.isNativePlatform?.());
}

function nativePlugin(): NativeNotifications | null {
  if (!isNativeShell()) return null;
  return capacitorBridge()?.Plugins?.LocalNotifications ?? null;
}

// Never the web route inside the native shell: nothing there can keep the
// promise of a reminder, so a shell without the plugin counts as unsupported.
function webNotificationsAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !isNativeShell() &&
    'Notification' in window &&
    'serviceWorker' in navigator
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

/*
 * Inexact on purpose. The plugin wants exact alarms unless told otherwise, and
 * on a phone that hasn't granted them it opens the system's "Alarms & reminders"
 * screen from every schedule() call, which here means on every launch. A nudge
 * that lands a few minutes late is fine; Android still wakes for it when idle.
 */
const NATIVE_TIMING = { isExactNotification: false };

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
            // No schedule: an inexact alarm could hold a test back for minutes.
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
          ...NATIVE_TIMING,
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
          ...NATIVE_TIMING,
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

/*
 * Scheduled sessions (see `lib/schedule`): the reader's own dated sessions,
 * delivered alongside the fixed reminders but kept apart from them, in native
 * ids 20000 onwards so neither can ever cancel the other.
 */

/** What a scheduled session's notification says, and where a tap lands. */
export interface ScheduleNotice {
  title: string;
  body: string;
  url: string;
}

const SCHEDULE_NATIVE_BASE = 20000;
/** How far ahead, and how many, are handed to the OS on each launch. */
const SCHEDULE_DAYS_AHEAD = 30;
const SCHEDULE_NATIVE_LIMIT = 40;
/** The native ids handed over last time, so a sync can clear exactly those. */
const SCHEDULE_IDS_KEY = 'serenity.schedule.native.v1';

function readScheduledIds(): number[] {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_IDS_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

async function syncScheduleNative(
  entries: ScheduledSession[],
  describe: (entry: ScheduledSession) => ScheduleNotice | null,
): Promise<void> {
  const native = nativePlugin();
  if (!native) return;
  try {
    const previous = readScheduledIds();
    if (previous.length > 0) await native.cancel({ notifications: previous.map((id) => ({ id })) });

    const notifications = upcomingOccurrences(entries, new Date(), SCHEDULE_DAYS_AHEAD, SCHEDULE_NATIVE_LIMIT)
      .map(({ entry, at }, index) => {
        const notice = describe(entry);
        if (!notice) return null;
        return {
          id: SCHEDULE_NATIVE_BASE + index,
          title: notice.title,
          body: notice.body,
          schedule: { at, allowWhileIdle: true },
          extra: { url: notice.url },
          ...NATIVE_TIMING,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (notifications.length > 0) await native.schedule({ notifications });
    window.localStorage.setItem(SCHEDULE_IDS_KEY, JSON.stringify(notifications.map((n) => n.id)));
  } catch {
    // Without the plugin there are simply no scheduled notifications.
  }
}

/**
 * Keeps notifications for the reader's scheduled sessions live, and returns
 * the teardown. Native: the next month of them is handed to the OS (refreshed
 * every launch and every change). Web: a ticker shows each one when due,
 * while the app is open.
 */
export function startScheduledSessions(
  entries: ScheduledSession[],
  describe: (entry: ScheduledSession) => ScheduleNotice | null,
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (nativePlugin()) {
    void syncScheduleNative(entries, describe);
    return () => {};
  }

  if (!webNotificationsAvailable() || entries.length === 0) return () => {};
  let stopped = false;

  const tick = () => {
    if (stopped || Notification.permission !== 'granted') return;
    const now = new Date();
    const delivered = readDelivered();
    for (const entry of entries) {
      const key = `schedule:${entry.id}`;
      if (!isScheduleDue(entry, now, delivered[key])) continue;
      const notice = describe(entry);
      if (!notice) continue;
      markDelivered(key, dayKey(now));
      void displayWebNotification(notice.title, {
        body: notice.body,
        tag: `serenity-${key}`,
        url: notice.url,
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

/**
 * Calls `open` with the screen a tapped native notification points at, and
 * returns the teardown. A tap that launched the app is held by the plugin until
 * this listens. The web's equivalent lives in `sw.js`.
 */
export function onNotificationTap(open: (url: string) => void): () => void {
  const native = nativePlugin();
  if (!native) return () => {};

  const subscription = native.addListener('localNotificationActionPerformed', (action) => {
    const url = tappedUrl(action);
    if (url) open(url);
  });
  return () => {
    void Promise.resolve(subscription).then((handle) => handle.remove());
  };
}

/* ------------------------------------------------------------------ *
 * Leftovers from Circles
 *
 * Circles (small groups that sat together) has been removed. Phones that ran
 * an earlier build may still hold OS-scheduled nudges for its sessions, in the
 * id range it reserved, and their tap would open a page that no longer exists.
 * ------------------------------------------------------------------ */

const LEGACY_CIRCLE_NATIVE_FIRST_ID = 1000;
const LEGACY_CIRCLE_NATIVE_SLOTS = 100;
const LEGACY_CIRCLE_KEYS = ['serenity.circles.v1', 'serenity.circles.reminded.v1'];

/** Cancels any circle reminders an earlier build scheduled, and forgets its local state. */
export function clearLegacyCircleReminders(): void {
  if (typeof window === 'undefined') return;

  for (const key of LEGACY_CIRCLE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to clear.
    }
  }

  const native = nativePlugin();
  if (!native) return;
  void native
    .cancel({
      notifications: Array.from({ length: LEGACY_CIRCLE_NATIVE_SLOTS }, (_, index) => ({
        id: LEGACY_CIRCLE_NATIVE_FIRST_ID + index,
      })),
    })
    .catch(() => {
      // Without the plugin there is nothing scheduled to cancel.
    });
}
