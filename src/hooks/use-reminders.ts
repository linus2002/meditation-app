'use client';

import * as React from 'react';

import { useInspiration } from '@/hooks/use-inspiration';
import {
  checkPermission,
  deliveryMode,
  isNativeShell,
  requestPermission,
  startReminders,
  type BodyResolver,
  type DeliveryMode,
  type PermissionState,
} from '@/lib/notifications';
import { reminderBody, reminderDefinitions } from '@/lib/reminders';
import { useApp } from '@/providers/app-provider';

/**
 * Reads the two reminder toggles out of stored settings and keeps the delivery
 * layer in step with them.
 *
 * Permission is deliberately not requested here. A browser only honours the
 * prompt inside a gesture, and one that appears unbidden on first load is the
 * kind a reader dismisses forever without reading it - so asking belongs to the
 * moment the toggle is tapped, which is what `enable` below is for.
 *
 * Pass `schedule` to actually run the delivery loop. Exactly one mount does
 * that - `ReminderScheduler` in the root layout - while the profile screen uses
 * the same hook read-only, for the permission state and the toggle handlers.
 */
/** Fired when notification permission was just asked for, so every mount re-reads it. */
const PERMISSION_CHANGED = 'serenity:notification-permission';

export function useReminders({ schedule = false }: { schedule?: boolean } = {}) {
  const { settings, setSetting, hydrated } = useApp();

  const [permission, setPermission] = React.useState<PermissionState>('prompt');
  const [mode, setMode] = React.useState<DeliveryMode>('unsupported');
  // Which words fit: the installed app is not "this browser".
  const [inApp, setInApp] = React.useState(false);

  React.useEffect(() => {
    setMode(deliveryMode());
    setInApp(isNativeShell());
    let cancelled = false;
    const refresh = () => {
      void checkPermission().then((state) => {
        if (!cancelled) setPermission(state);
      });
    };

    // Permission is changed in browser or system settings, away from the app,
    // so it is re-read whenever the reader comes back rather than only once.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    document.addEventListener('visibilitychange', onVisible);
    // Granted from another screen (Profile, the calendar): every mount re-reads.
    window.addEventListener(PERMISSION_CHANGED, refresh);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(PERMISSION_CHANGED, refresh);
    };
  }, []);

  // A stable, order-independent key, so the scheduler restarts when the set of
  // enabled reminders actually changes rather than on every settings write.
  const enabledKey = reminderDefinitions
    .filter((entry) => settings[entry.id])
    .map((entry) => entry.id)
    .join(',');

  // The daily inspiration is picked for this reader; every other reminder
  // says its own fixed words.
  const { resolve } = useInspiration();
  const resolveBody = React.useCallback<BodyResolver>(
    (reminder, dateKey) =>
      reminder.id === 'inspiration' ? resolve(dateKey).inspiration.text : reminderBody(reminder, dateKey),
    [resolve],
  );

  React.useEffect(() => {
    if (!schedule || !hydrated || permission !== 'granted') return;
    return startReminders(enabledKey ? enabledKey.split(',') : [], resolveBody);
  }, [schedule, hydrated, permission, enabledKey, resolveBody]);

  /**
   * Turns a reminder on, asking for permission first.
   *
   * The toggle only moves if permission is actually granted: switching it on
   * while notifications are blocked would put the app right back where it
   * started, showing a promise nothing can keep.
   */
  const enable = React.useCallback(
    async (id: string) => {
      const granted = permission === 'granted' ? 'granted' : await requestPermission();
      setPermission(granted);
      window.dispatchEvent(new Event(PERMISSION_CHANGED));

      if (granted !== 'granted') return false;
      setSetting(id, true);
      return true;
    },
    [permission, setSetting],
  );

  const disable = React.useCallback((id: string) => setSetting(id, false), [setSetting]);

  /** Asks for permission on its own, without switching any reminder on. */
  const allow = React.useCallback(async () => {
    const state = await requestPermission();
    setPermission(state);
    window.dispatchEvent(new Event(PERMISSION_CHANGED));
    return state;
  }, []);

  return { permission, mode, inApp, enable, disable, allow };
}
