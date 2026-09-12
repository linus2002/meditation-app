import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appointmentCopy,
  appointmentKinds,
  appointmentSession,
  getSupportSession,
  supportDisclaimer,
  supportMoments,
  supportSessions,
} from '@/data/support-track';

/**
 * Guard rails for the cancer support track. They do not replace the clinical
 * and legal review the README requires before release — they only stop the
 * most obvious mistakes from creeping back in later.
 */

// Words that tend to make, or imply, a medical claim — or push positivity.
const CLAIM_WORDS =
  /\b(cure[sd]?|curing|heal(s|ed|ing)?|immun\w*|fight\w*|beat(s|ing)?|battle\w*|surviv\w*|remission|recover\w*|stay positive|positive thinking|think positive)\b/i;

const allCopy = [
  ...supportSessions.flatMap((session) => [
    session.title,
    session.moment,
    session.forWho,
    session.closing,
    ...session.intro,
  ]),
  ...supportMoments.map((moment) => moment.title),
  supportDisclaimer.title,
  supportDisclaimer.body,
  supportDisclaimer.urgent,
  supportDisclaimer.short,
  ...appointmentKinds.map((kind) => kind.label),
  ...Object.values(appointmentCopy).flatMap((byDay) =>
    Object.values(byDay).flatMap((copy) => [copy.headline, copy.line]),
  ),
];

describe('the support track', () => {
  it('makes no medical claims and never pushes positivity', () => {
    for (const line of allCopy) {
      expect(line, line).not.toMatch(CLAIM_WORDS);
    }
  });

  it('says plainly that it is support alongside a care team', () => {
    expect(supportDisclaimer.body).toMatch(/care team/i);
    expect(supportDisclaimer.body).toMatch(/not medical advice/i);
    expect(supportDisclaimer.urgent).toMatch(/emergency/i);
  });

  it('keeps tired-day sessions genuinely short', () => {
    for (const id of supportMoments.find((moment) => moment.id === 'fatigue')?.sessionIds ?? []) {
      expect(getSupportSession(id)?.durationSeconds).toBeLessThanOrEqual(5 * 60);
    }
  });

  it('never asks anyone to hold their breath', () => {
    for (const session of supportSessions) {
      for (const phase of session.breathPattern) {
        expect(phase.label.toLowerCase(), session.id).not.toContain('hold');
      }
    }
  });

  it('never rings a bell at the end of a sleep session', () => {
    expect(getSupportSession('steroid-night')?.endBell).toBe(false);
  });

  it('lets an infusion session keep going', () => {
    expect(getSupportSession('chemo-chair')?.keepGoing).toBe(true);
  });

  it('includes something written for caregivers themselves', () => {
    expect(supportSessions.some((session) => session.audience === 'caregiver')).toBe(true);
  });

  it('links every moment to real sessions, and gives every session one', () => {
    const linked = new Set(supportMoments.flatMap((moment) => moment.sessionIds));
    for (const moment of supportMoments) {
      for (const id of moment.sessionIds) expect(getSupportSession(id), id).toBeDefined();
    }
    for (const session of supportSessions) expect(linked.has(session.id), session.id).toBe(true);
  });

  it('has a page for every session, so each one is precached for offline use', () => {
    for (const session of supportSessions) {
      const page = path.join(process.cwd(), 'src', 'app', 'support', session.id, 'page.tsx');
      expect(existsSync(page), page).toBe(true);
    }
  });

  it('sends every kind of appointment to a real session', () => {
    for (const kind of appointmentKinds) {
      expect(getSupportSession(appointmentSession[kind.id]), kind.id).toBeDefined();
    }
  });

  it('has unique ids', () => {
    expect(new Set(supportSessions.map((session) => session.id)).size).toBe(supportSessions.length);
  });
});
