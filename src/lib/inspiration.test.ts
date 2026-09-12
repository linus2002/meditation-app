import { describe, expect, it } from 'vitest';

import { inspirationForDate, type InspirationTag } from '@/data/inspirations';
import {
  deriveSignals,
  pickInspiration,
  type InspirationSignals,
} from '@/lib/inspiration';
import { planDay, prunePlan, type InspirationPlan } from '@/lib/inspiration-plan';
import type { Reflection, SessionRecord, SleepLog } from '@/types';

const today = '2026-09-12';

const quiet: InspirationSignals = { heavyDay: false, roughNight: false, daysAway: 0, streak: 0 };

function pick(signals: Partial<InspirationSignals>) {
  return pickInspiration({ dateKey: today, todayKey: today, signals: { ...quiet, ...signals } });
}

const has = (tag: InspirationTag) => (result: ReturnType<typeof pickInspiration>) =>
  result.inspiration.tags.includes(tag);

describe('pickInspiration', () => {
  it('falls back to the everyday rotation when nothing is known', () => {
    const result = pick({});
    expect(result.reason).toBeNull();
    expect(result.inspiration.text).toBe(inspirationForDate(today));
  });

  it('turns gentler after a heavy day', () => {
    const result = pick({ heavyDay: true });
    expect(has('hard-day')(result)).toBe(true);
    expect(result.reason).toBe('heavy-day');
  });

  it('thinks of sleep after a rough night', () => {
    const result = pick({ roughNight: true });
    expect(has('sleep')(result)).toBe(true);
    expect(result.reason).toBe('rough-night');
  });

  it('welcomes someone back after a few days away, without guilt', () => {
    const result = pick({ daysAway: 5 });
    expect(has('new-start')(result)).toBe(true);
    expect(result.reason).toBe('welcome-back');
  });

  it('encourages a run of days', () => {
    const result = pick({ streak: 5 });
    expect(has('momentum')(result)).toBe(true);
    expect(result.reason).toBe('momentum');
  });

  it('follows the themes the reader chose', () => {
    const result = pickInspiration({ dateKey: today, todayKey: today, signals: quiet, themes: ['focus'] });
    expect(has('focus')(result)).toBe(true);
    expect(result.reason).toBe('theme');
  });

  it('leans towards the goal from the Circles questions', () => {
    const result = pickInspiration({ dateKey: today, todayKey: today, signals: quiet, goal: 'sleep' });
    expect(has('sleep')(result)).toBe(true);
    expect(result.reason).toBe('goal');
  });

  it('lets a passing mood shape today and tomorrow, not next week', () => {
    const heavy = { ...quiet, heavyDay: true };
    const tomorrow = pickInspiration({ dateKey: '2026-09-13', todayKey: today, signals: heavy });
    const later = pickInspiration({ dateKey: '2026-09-16', todayKey: today, signals: heavy });
    expect(tomorrow.reason).toBe('heavy-day');
    expect(later.reason).toBeNull();
  });

  it('gives the same answer for the same day', () => {
    expect(pick({ heavyDay: true }).inspiration.id).toBe(pick({ heavyDay: true }).inspiration.id);
  });

  it('still varies from day to day within a theme', () => {
    const ids = ['2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15'].map(
      (dateKey) =>
        pickInspiration({ dateKey, todayKey: dateKey, signals: quiet, themes: ['calm'] }).inspiration.id,
    );
    for (let index = 1; index < ids.length; index += 1) {
      expect(ids[index]).not.toBe(ids[index - 1]);
    }
  });
});

describe('deriveSignals', () => {
  const reflection = (date: string, weight: number): Reflection => ({
    date,
    promptId: 'steady',
    prompt: 'When did you feel steady?',
    answer: '…',
    weight,
    updatedAt: 0,
  });
  const night = (bedtime: string, wakeTime: string, quality: number): SleepLog => ({
    date: today,
    bedtime,
    wakeTime,
    quality,
    updatedAt: 0,
  });
  const sit = (date: string): SessionRecord => ({
    id: date,
    meditationId: 'morning-clarity',
    date,
    seconds: 600,
    completed: true,
    startedAt: 0,
  });
  const signals = (input: Partial<Parameters<typeof deriveSignals>[0]>) =>
    deriveSignals({ todayKey: today, sessions: [], reflections: [], sleepLogs: [], ...input });

  it('notices a heavy reflection from today or yesterday only', () => {
    expect(signals({ reflections: [reflection('2026-09-11', 1)] }).heavyDay).toBe(true);
    expect(signals({ reflections: [reflection('2026-09-12', 3)] }).heavyDay).toBe(false);
    expect(signals({ reflections: [reflection('2026-09-10', 1)] }).heavyDay).toBe(false);
  });

  it('notices a poor or short night', () => {
    expect(signals({ sleepLogs: [night('23:00', '07:00', 2)] }).roughNight).toBe(true);
    expect(signals({ sleepLogs: [night('01:00', '06:00', 4)] }).roughNight).toBe(true);
    expect(signals({ sleepLogs: [night('23:00', '07:00', 4)] }).roughNight).toBe(false);
  });

  it('counts days away, and knows when there has never been a sit', () => {
    expect(signals({ sessions: [sit('2026-09-07')] }).daysAway).toBe(5);
    expect(signals({}).daysAway).toBeNull();
  });

  it('counts a streak ending today or yesterday', () => {
    expect(signals({ sessions: [sit('2026-09-12'), sit('2026-09-11'), sit('2026-09-10')] }).streak).toBe(3);
    expect(signals({ sessions: [sit('2026-09-11'), sit('2026-09-10')] }).streak).toBe(2);
    expect(signals({ sessions: [sit('2026-09-10')] }).streak).toBe(0);
  });
});

describe('planDay', () => {
  const choose = (id: string) => () => ({ id, reason: null });

  it('keeps the message a day has already had', () => {
    const plan: InspirationPlan = { [today]: { id: 'shown', reason: null } };
    expect(planDay(plan, today, today, choose('new')).entry.id).toBe('shown');
  });

  it('re-decides days that have not come yet', () => {
    const plan: InspirationPlan = { '2026-09-14': { id: 'old-plan', reason: null } };
    expect(planDay(plan, '2026-09-14', today, choose('fresh')).entry.id).toBe('fresh');
  });

  it('settles a day the first time it is asked for', () => {
    const { entry, plan } = planDay({}, today, today, choose('first'));
    expect(entry.id).toBe('first');
    expect(plan[today].id).toBe('first');
  });

  it('forgets days older than a week', () => {
    const plan: InspirationPlan = {
      '2026-09-01': { id: 'old', reason: null },
      '2026-09-10': { id: 'recent', reason: null },
    };
    expect(Object.keys(prunePlan(plan, today))).toEqual(['2026-09-10']);
  });
});
