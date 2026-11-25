import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { practices } from '@/data/kapwa-knowledge';
import { withScreen } from '@/lib/activity-log';
import { converse, type DialogueMemory } from '@/lib/kapwa-dialogue';
import { readGivenName, screenName, when, type KapwaProfile } from '@/lib/kapwa-profile';
import { canRun, planSeconds, runnerAt, runnerPlan } from '@/lib/kapwa-runner';
import type { SessionRecord } from '@/types';

const NOW = new Date(2026, 10, 25, 20, 30).getTime();
const HOUR = 60 * 60 * 1000;

function sitting(meditationId: string, hoursAgo: number, seconds: number, completed = true): SessionRecord {
  const at = NOW - hoursAgo * HOUR;
  const day = new Date(at);
  return {
    id: `${meditationId}-${hoursAgo}`,
    meditationId,
    date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
    seconds,
    completed,
    startedAt: at,
  };
}

const profile: KapwaProfile = {
  name: 'Ana',
  email: 'ana@example.com',
  sessions: [sitting('box-breathing', 2, 197), sitting('night-wind-down', 26, 300, false), sitting('box-breathing', 50, 197)],
  favorites: ['body-scan', 'open-heart'],
  favoriteStories: ['night-ferry'],
  goalMinutes: 10,
  sleepLogs: [],
  reflections: 3,
  screens: [
    { path: '/yoga/desk-stretch', at: NOW - HOUR },
    { path: '/kapwa', at: NOW - 2 * HOUR },
    { path: '/sleep', at: NOW - 3 * HOUR },
  ],
  previousVisitAt: NOW - 26 * HOUR,
  now: NOW,
};

describe('asking Kapwa about yourself', () => {
  it('asks before reading anything, and answers once allowed', () => {
    const ask = converse('who am i', { profile });
    expect(ask.memory.intentId).toBe('consent');
    expect(ask.text).toMatch(/stays on this phone/);
    expect(ask.suggestions).toEqual(['Yes, that’s okay', 'No thanks']);

    const yes = converse('Yes, that’s okay', { profile, last: ask.memory });
    expect(yes.effects).toEqual({ consent: 'yes' });
    expect(yes.text).toMatch(/^You’re Ana\. You’re signed in as ana@example\.com\./);
    expect(yes.text).toMatch(/3 sessions/);
    expect(yes.text).toMatch(/Your last session was Box Breathing, today at/);
  });

  it('respects no, and says how to change it', () => {
    const ask = converse('who am i', { profile });
    const no = converse('No thanks', { profile, last: ask.memory });
    expect(no.effects).toEqual({ consent: 'no' });
    const again = converse('what did i do last time', { profile, personal: 'no' });
    expect(again.text).toMatch(/not using your activity/);
    expect(again.text).toMatch(/use my activity/);
    expect(again.text).not.toMatch(/Box Breathing/);
  });

  it('tells what was done last, and the screens opened', () => {
    const reply = converse('when did i last meditate', { profile, personal: 'yes' });
    expect(reply.intentId).toBe('me:last');
    expect(reply.text).toMatch(/Box Breathing, today at .*listened to the end/);
    expect(reply.text).toMatch(/Night Wind Down \(yesterday at/);
    expect(reply.text).toMatch(/you last opened Serenity yesterday at/);
    expect(reply.text).toMatch(/Recently you opened: Desk Break Stretch \(yoga\), Sleep\./);
    expect(reply.actions[0]).toEqual({ type: 'session', id: 'box-breathing' });
  });

  it('reports progress against the goal', () => {
    const reply = converse('how am i doing', { profile, personal: 'yes' });
    expect(reply.intentId).toBe('me:progress');
    expect(reply.text).toMatch(/Today you’ve done 3 of your 10 minutes/);
  });

  it('suggests something for now, leaving out what was just played', () => {
    const reply = converse('what should i do today', { profile, personal: 'yes' });
    expect(reply.intentId).toBe('me:suggest');
    expect(reply.text).toMatch(/It’s late/);
    expect(reply.actions.some((action) => action.type === 'session' && action.id === 'box-breathing')).toBe(false);
  });

  it('lists what was saved', () => {
    const reply = converse('my favorites', { profile, personal: 'yes' });
    expect(reply.text).toMatch(/2 sessions and 1 story/);
  });

  it('can be switched on and off by asking', () => {
    expect(converse('use my activity', { profile }).effects).toEqual({ consent: 'yes' });
    expect(converse('stop using my activity', { profile, personal: 'yes' }).effects).toEqual({ consent: 'no' });
  });

  it('learns a name it is given, and greets by it', () => {
    expect(readGivenName('call me ana')).toBe('Ana');
    expect(readGivenName('my name is Juan Carlos Reyes')).toBe('Juan Carlos');
    expect(readGivenName('my name is not important')).toBeNull();
    expect(converse('hi, my name is Mia').effects).toEqual({ name: 'Mia' });
    expect(converse('hello', { profile }).text).toMatch(/^Hi there, Ana\./);
  });

  it('says when, in words', () => {
    expect(when(NOW - 2 * HOUR, NOW)).toMatch(/^today at 6:30 pm$/);
    expect(when(NOW - 26 * HOUR, NOW)).toMatch(/^yesterday at/);
    expect(when(NOW - 4 * 24 * HOUR, NOW)).toBe('4 days ago');
    expect(screenName('/kapwa')).toBeNull();
    expect(screenName('/stories/night-ferry')).toBe('The Night Ferry (story)');
  });
});

describe('the screen log', () => {
  it('keeps the latest screens and notices a new visit', () => {
    let log = withScreen({ screens: [] }, '/home', NOW - 3 * HOUR);
    log = withScreen(log, '/sleep', NOW - 3 * HOUR + 60_000);
    log = withScreen(log, '/sleep', NOW - 3 * HOUR + 90_000);
    expect(log.screens.map((screen) => screen.path)).toEqual(['/sleep', '/home']);
    expect(log.previousVisitAt).toBeUndefined();
    log = withScreen(log, '/yoga', NOW);
    expect(log.previousVisitAt).toBe(NOW - 3 * HOUR + 90_000);
    for (let i = 0; i < 30; i++) log = withScreen(log, `/p${i}`, NOW + i);
    expect(log.screens).toHaveLength(15);
  });
});

describe('the guided runner', () => {
  it('runs every timed practice, close to its length', () => {
    for (const practice of practices.filter(canRun)) {
      const plan = runnerPlan(practice);
      expect(plan.length, practice.id).toBeGreaterThan(0);
      expect(planSeconds(plan), practice.id).toBeGreaterThan(30);
      expect(planSeconds(plan), practice.id).toBeLessThan(practice.minutes * 60 * 2 + 120);
    }
  });

  it('repeats a breathing cycle and knows where it is', () => {
    const plan = runnerPlan(practices.find((practice) => practice.id === 'box-breathing')!);
    expect(plan.filter((step) => step.breath).length % 4).toBe(0);
    expect(runnerAt(plan, 0).index).toBe(0);
    expect(runnerAt(plan, planSeconds(plan) + 1).done).toBe(true);
  });

  it('offers Start on practices it can guide, and asks how it went at the end', () => {
    const taught = converse('box breathing');
    expect(taught.actions[0]).toEqual({ type: 'run', id: 'box-breathing' });
    expect(converse('what is meditation').actions.some((action) => action.type === 'run')).toBe(false);
    const after = converse('done', { last: taught.memory as DialogueMemory });
    expect(after.text).toMatch(/How (do you feel|are you feeling) now/);
  });
});

describe('speed', () => {
  let started = 0;
  beforeEach(() => {
    started = performance.now();
  });
  afterEach(() => {
    // Recorded for the report; generous, since test machines vary.
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('answers a hundred messages in well under a second', () => {
    for (let i = 0; i < 100; i++) converse(i % 2 ? 'i feel so overwhelmed with everything at work' : 'cnt slep tonite');
  });
});
