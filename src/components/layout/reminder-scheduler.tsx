'use client';

import { useReminders } from '@/hooks/use-reminders';

/**
 * The single mount that keeps the reminder schedule live.
 *
 * It renders nothing and sits in the root layout, so the schedule is
 * re-synced on every launch - which is what a native shell needs after an
 * update, and what the web ticker needs in order to run at all.
 */
export function ReminderScheduler() {
  useReminders({ schedule: true });
  return null;
}
