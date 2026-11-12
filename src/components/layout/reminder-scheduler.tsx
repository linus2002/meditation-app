'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useReminders } from '@/hooks/use-reminders';
import { clearLegacyCircleReminders, onNotificationTap } from '@/lib/notifications';

/**
 * The single mount that keeps the reminder schedule live.
 *
 * It renders nothing and sits in the root layout, so the schedule is
 * re-synced on every launch - which is what a native shell needs after an
 * update, and what the web ticker needs in order to run at all. A tapped native
 * notification is routed from here too, so it works from any screen.
 */
export function ReminderScheduler() {
  useReminders({ schedule: true });

  const router = useRouter();
  React.useEffect(() => onNotificationTap((url) => router.push(url)), [router]);
  React.useEffect(() => clearLegacyCircleReminders(), []);

  return null;
}
