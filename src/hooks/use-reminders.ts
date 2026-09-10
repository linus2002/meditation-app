'use client';

import * as React from 'react';

import {
  checkPermission,
  deliveryMode,
  requestPermission,
  startReminders,
  type DeliveryMode,
  type PermissionState,
} from '@/lib/notifications';
import { reminderDefinitions } from '@/lib/reminders';
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
export function useReminders({ schedule = false }: { schedule?: boolean } = {}) {
  const { settings, setSetting, hydrated } = useApp();

  const [permission, setPermission] = React.useState<PermissionState>('prompt');
  const [mode, setMode] = React.useState<DeliveryMode>('unsupported');

  React.useEffect(() => {
    setMode(deliveryMode());
    let cancelled = false;
    void checkPermission().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A stable, order-independent key, so the scheduler restarts when the set of
  // enabled reminders actually changes rather than on every settings write.
  const enabledKey = reminderDefinitions
    .filter((entry) => settings[entry.id])
    .map((entry) => entry.id)
    .join(',');

  React.useEffect(() => {
    if (!schedule || !hydrated || permission !== 'granted') return;
    return startReminders(enabledKey ? enabledKey.split(',') : []);
  }, [schedule, hydrated, permission, enabledKey]);

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

      if (granted !== 'granted') return false;
      setSetting(id, true);
      return true;
    },
    [permission, setSetting],
  );

  const disable = React.useCallback((id: string) => setSetting(id, false), [setSetting]);

  return { permission, mode, enable, disable };
}
