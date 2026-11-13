'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { scheduleItemDetails, scheduleKindLabel } from '@/data/schedule-items';
import { useReminders } from '@/hooks/use-reminders';
import { useSchedule } from '@/hooks/use-schedule';
import {
  clearLegacyCircleReminders,
  onNotificationTap,
  startScheduledSessions,
  type ScheduleNotice,
} from '@/lib/notifications';
import { scheduleUrl, type ScheduledSession } from '@/lib/schedule';

/** The words on a scheduled session's notification. */
function describe(entry: ScheduledSession): ScheduleNotice | null {
  const item = scheduleItemDetails(entry.kind, entry.itemId);
  if (!item) return null;
  const minutes = Math.max(1, Math.round(item.seconds / 60));
  return {
    title: `Time for ${item.title}`,
    body: `Your scheduled ${scheduleKindLabel[entry.kind].toLowerCase()} · ${minutes} min. Tap to begin.`,
    url: scheduleUrl(entry),
  };
}

/**
 * The single mount that keeps the reminder schedule live.
 *
 * It renders nothing and sits in the root layout, so the schedule is
 * re-synced on every launch - which is what a native shell needs after an
 * update, and what the web ticker needs in order to run at all. A tapped native
 * notification is routed from here too, so it works from any screen.
 *
 * It also keeps the reader's own scheduled sessions (the calendar) live, the
 * same way, whenever notifications are allowed.
 */
export function ReminderScheduler() {
  const { permission } = useReminders({ schedule: true });
  const { schedules, ready } = useSchedule();

  React.useEffect(() => {
    if (!ready || permission !== 'granted') return;
    return startScheduledSessions(schedules, describe);
  }, [ready, permission, schedules]);

  const router = useRouter();
  React.useEffect(() => onNotificationTap((url) => router.push(url)), [router]);
  React.useEffect(() => clearLegacyCircleReminders(), []);

  return null;
}
