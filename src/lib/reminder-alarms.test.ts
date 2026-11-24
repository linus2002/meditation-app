import { describe, expect, it } from 'vitest';

import { DAILY_BODY_DAYS, reminderAlarms, scheduleAlarms } from '@/lib/reminder-alarms';
import { reminderDefinitions, type ReminderDefinition } from '@/lib/reminders';
import type { ScheduledSession } from '@/lib/schedule';

const now = new Date(2026, 10, 23, 9, 15);
const byId = (id: string) => reminderDefinitions.find((entry) => entry.id === id) as ReminderDefinition;

describe('reminderAlarms', () => {
  it('hands over a rule, not a list of moments', () => {
    const [alarm] = reminderAlarms([byId('bedtime')], now, (reminder) => reminder.body);
    expect(alarm).toEqual({
      key: 'reminder-bedtime',
      title: 'Time to wind down',
      body: 'Dim the lights and pick something for sleep.',
      url: '/sleep',
      time: '22:30',
      repeat: 'daily',
      date: '2026-11-23',
      lateMinutes: 30,
    });
  });

  it('gives a daily-changing message its words per date, from today, with the fixed words after', () => {
    const [alarm] = reminderAlarms([byId('inspiration')], now, (_reminder, key) => `words for ${key}`);
    const keys = Object.keys(alarm.bodies ?? {});
    expect(keys).toHaveLength(DAILY_BODY_DAYS);
    // 08:00 has passed at 09:15, but a late delivery today still finds its words.
    expect(keys[0]).toBe('2026-11-23');
    expect(alarm.bodies?.['2026-11-24']).toBe('words for 2026-11-24');
    expect(alarm.body).toBe('A short, uplifting thought for your day.');
    expect(alarm.lateMinutes).toBe(14 * 60);
  });
});

describe('scheduleAlarms', () => {
  const entry = (overrides: Partial<ScheduledSession> = {}): ScheduledSession => ({
    id: 'a1',
    kind: 'meditation',
    itemId: 'open-heart',
    date: '2026-11-27',
    time: '06:45',
    repeat: 'weekly',
    createdAt: 0,
    ...overrides,
  });

  it('keeps the repeat and first date, so weekly rules fall on the right day', () => {
    const [alarm] = scheduleAlarms([entry()], () => ({ title: 'Time for Open Heart', body: 'Tap', url: '/player/open-heart' }));
    expect(alarm).toMatchObject({ key: 'schedule-a1', repeat: 'weekly', date: '2026-11-27', time: '06:45' });
  });

  it('leaves out sessions whose content has gone', () => {
    expect(scheduleAlarms([entry()], () => null)).toEqual([]);
  });
});
