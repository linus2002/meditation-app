import { dayKey, LATE_DELIVERY_LIMIT_MS, upcomingDaily, type ReminderDefinition } from '@/lib/reminders';
import type { ScheduledSession, ScheduleRepeat } from '@/lib/schedule';

/**
 * The rules handed to the Android app's own reminder scheduler
 * (ReminderScheduler.java). It keeps rules, not fixed moments: it arms only the
 * next occurrence of each, in the phone's zone at the time, and arms the one
 * after when it fires. So nothing here runs out, and travel needs no relaunch.
 *
 * Pure, so the shapes are tested without a phone.
 */

export interface NativeReminderAlarm {
  /** Stable per rule, so a rule that is set again keeps its place. */
  key: string;
  title: string;
  /** What it says when `bodies` has nothing for the day. */
  body: string;
  /** Words for particular local dates, `YYYY-MM-DD`. */
  bodies?: Record<string, string>;
  url: string;
  /** Local wall-clock time, `HH:MM`. */
  time: string;
  repeat: ScheduleRepeat;
  /** The first (or only) date, `YYYY-MM-DD`. Weekly rules fall on its weekday. */
  date: string;
  /** How late a missed one may still be shown, after a reboot or a clock change. */
  lateMinutes: number;
}

/** Days of a daily-changing message handed over at once; past them, the fixed words. */
export const DAILY_BODY_DAYS = 60;

const lateMinutes = (ms: number | undefined) => Math.round((ms ?? LATE_DELIVERY_LIMIT_MS) / 60_000);

/** The enabled daily reminders as rules. */
export function reminderAlarms(
  enabled: ReminderDefinition[],
  now: Date,
  bodyOf: (reminder: ReminderDefinition, dateKey: string) => string,
): NativeReminderAlarm[] {
  return enabled.map((reminder) => {
    const alarm: NativeReminderAlarm = {
      key: `reminder-${reminder.id}`,
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      time: reminder.time,
      repeat: 'daily',
      date: dayKey(now),
      lateMinutes: lateMinutes(reminder.lateLimitMs),
    };
    if (reminder.bodyFor) {
      // From today, even if today's has already gone: a late delivery still finds its words.
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      alarm.bodies = Object.fromEntries(
        upcomingDaily(reminder.time, today, DAILY_BODY_DAYS).map((at) => {
          const key = dayKey(at);
          return [key, bodyOf(reminder, key)];
        }),
      );
    }
    return alarm;
  });
}

export interface ScheduleNoticeWords {
  title: string;
  body: string;
  url: string;
}

/** The reader's scheduled sessions as rules. Ones whose content has gone are left out. */
export function scheduleAlarms(
  entries: ScheduledSession[],
  describe: (entry: ScheduledSession) => ScheduleNoticeWords | null,
): NativeReminderAlarm[] {
  return entries.flatMap((entry) => {
    const notice = describe(entry);
    if (!notice) return [];
    return [
      {
        key: `schedule-${entry.id}`,
        title: notice.title,
        body: notice.body,
        url: notice.url,
        time: entry.time,
        repeat: entry.repeat,
        date: entry.date,
        lateMinutes: lateMinutes(undefined),
      },
    ];
  });
}
