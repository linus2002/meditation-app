import type { SoundscapeId } from '@/lib/audio/soundscapes';
import type { BreathPhase } from '@/types';

/**
 * The cancer support track: sessions organised by the moment someone is
 * living through, not by meditation technique.
 *
 * ⚠ Every word here is a DRAFT. Before release, a qualified clinician — an
 * oncology social worker, a psycho-oncologist or a certified mindfulness-in-
 * oncology instructor — must review the moment list, each session's wording,
 * the breath pacing and the disclaimer, and mark each session `approved`.
 * The track stays switched off (`NEXT_PUBLIC_SUPPORT_TRACK`) until then.
 *
 * Voice: companionship, not encouragement. The wording makes room for fear,
 * anger, tiredness and grief, and never asks anyone to "stay positive".
 *
 * Hard rule: nothing here may claim or imply any effect on cancer, treatment,
 * results or survival. This is comfort and coping alongside medical care. A
 * test (`support-track.test.ts`) rejects the most common claim words.
 */

export type SupportAudience = 'patient' | 'caregiver';
export type ReviewStatus = 'draft' | 'approved';

export interface SupportSession {
  /** Also the page: `/support/<id>`. Each has its own file under `app/support/`. */
  id: string;
  title: string;
  /** The moment it is for, shown above the session. */
  moment: string;
  /** One line: who this is for. */
  forWho: string;
  audience: SupportAudience;
  /** A few short lines shown before starting. */
  intro: string[];
  /** One sentence at the end. Never a score, never a streak. */
  closing: string;
  durationSeconds: number;
  /** Offer more time at the end — for infusions that run for hours. */
  keepGoing?: boolean;
  /** False for sleep: the sound fades away with no bell. */
  endBell: boolean;
  /** Keep the screen awake while playing. Off for long or night sessions. */
  keepScreenOn: boolean;
  soundscape: SoundscapeId;
  /** Gentle in and out. No breath holds, which can be hard through nausea or breathlessness. */
  breathPattern: BreathPhase[];
  review: ReviewStatus;
}

/** How much longer "keep going" adds. */
export const EXTEND_SECONDS = 10 * 60;

const gentle: BreathPhase[] = [
  { label: 'Breathe in', seconds: 4 },
  { label: 'Breathe out', seconds: 6 },
];

const slower: BreathPhase[] = [
  { label: 'Breathe in', seconds: 5 },
  { label: 'Breathe out', seconds: 7 },
];

export const supportSessions: SupportSession[] = [
  {
    id: 'scan-day',
    title: 'Scan Day Companion',
    moment: 'Waiting for scan results',
    forWho: 'For the hours before a scan or results, when the waiting is the hardest part.',
    audience: 'patient',
    intro: [
      'Waiting is hard. Being scared right now makes complete sense.',
      'You don’t have to feel calm for this to help. We’ll just breathe for a while, with the fear here too.',
      'If your mind keeps jumping ahead, that’s okay. Each breath is somewhere to come back to.',
    ],
    closing: 'The waiting is still hard. You made a little room in it, and that counts.',
    durationSeconds: 10 * 60,
    endBell: true,
    keepScreenOn: true,
    soundscape: 'rain',
    breathPattern: gentle,
    review: 'draft',
  },
  {
    id: 'chemo-chair',
    title: 'Chemo Chair',
    moment: 'In the chemo chair',
    forWho: 'For the long hours of an infusion. Nothing to do but listen.',
    audience: 'patient',
    intro: [
      'You don’t need to do anything here. Just listen, and let the sound keep you company.',
      'Close your eyes if you like, or don’t. Drift off if you need to.',
      'When it ends, you can keep it going for as long as you’re there.',
    ],
    closing: 'You can keep going for as long as you’re there, or stop here.',
    durationSeconds: 30 * 60,
    keepGoing: true,
    // No bell at the end of a long listen — it should never startle.
    endBell: false,
    keepScreenOn: false,
    soundscape: 'ocean',
    breathPattern: slower,
    review: 'draft',
  },
  {
    id: 'two-minutes',
    title: 'Just Two Minutes',
    moment: 'No energy today',
    forWho: 'For days when even getting started feels like too much.',
    audience: 'patient',
    intro: [
      'Two minutes. That’s all this asks.',
      'Stay lying down if you’re lying down. There’s nothing to get right.',
    ],
    closing: 'That was enough. Rest now if you can.',
    durationSeconds: 2 * 60,
    endBell: true,
    keepScreenOn: true,
    soundscape: 'pad',
    breathPattern: gentle,
    review: 'draft',
  },
  {
    id: 'five-minutes',
    title: 'Five Minutes, That’s All I Have Today',
    moment: 'No energy today',
    forWho: 'Short on purpose — made for tired days, not cut down from something longer.',
    audience: 'patient',
    intro: [
      'Five minutes, and nothing more.',
      'Tired is allowed. Foggy is allowed. You don’t have to focus.',
      'Just let the breathing happen, and let the sound do the rest.',
    ],
    closing: 'That was five minutes for you. That’s enough for today.',
    durationSeconds: 5 * 60,
    endBell: true,
    keepScreenOn: true,
    soundscape: 'forest',
    breathPattern: gentle,
    review: 'draft',
  },
  {
    id: 'steroid-night',
    title: 'Steroid Night',
    moment: 'Can’t sleep on steroids',
    forWho: 'For wide-awake nights from treatment medication. Sleep isn’t the goal.',
    audience: 'patient',
    intro: [
      'Being awake at this hour is frustrating, and it isn’t your fault.',
      'You don’t have to fall asleep. Resting with your eyes closed is enough.',
      'The sound fades away on its own at the end. No bell.',
    ],
    closing: 'However the night goes, you haven’t done anything wrong.',
    durationSeconds: 20 * 60,
    endBell: false,
    keepScreenOn: false,
    soundscape: 'night',
    breathPattern: [
      { label: 'Breathe in', seconds: 4 },
      { label: 'Breathe out', seconds: 7 },
    ],
    review: 'draft',
  },
  {
    id: 'after-the-bell',
    title: 'After the Bell',
    moment: 'Treatment has ended',
    forWho: 'For the strange time after active treatment, when relief and fear can arrive together.',
    audience: 'patient',
    intro: [
      'Finishing treatment can feel different from what people expect — quieter, scarier, or just strange.',
      'Worry about the cancer coming back is very common. Having that fear doesn’t make you weak.',
      'Let’s give all of it some room, without needing to sort it out.',
    ],
    closing: 'Whatever you feel about what comes next is allowed.',
    durationSeconds: 12 * 60,
    endBell: true,
    keepScreenOn: true,
    soundscape: 'bowl',
    breathPattern: gentle,
    review: 'draft',
  },
  {
    id: 'caregiver-pause',
    title: 'Caregiver Pause',
    moment: 'Looking after someone',
    forWho: 'For partners, parents and friends. This one is about you, not them.',
    audience: 'caregiver',
    intro: [
      'Looking after someone you love is exhausting, even when you’d never say so.',
      'For these few minutes, you don’t have to be the strong one.',
      'Guilt, fear, tiredness — whatever comes up is allowed here.',
    ],
    closing: 'You matter too. Come back whenever you need a pause.',
    durationSeconds: 7 * 60,
    endBell: true,
    keepScreenOn: true,
    soundscape: 'pad',
    breathPattern: gentle,
    review: 'draft',
  },
];

export interface SupportMoment {
  id: string;
  title: string;
  audience: SupportAudience;
  sessionIds: string[];
}

/** The track's front door: "Where are you right now?" */
export const supportMoments: SupportMoment[] = [
  { id: 'scan', title: 'Waiting for scan results', audience: 'patient', sessionIds: ['scan-day'] },
  { id: 'infusion', title: 'In the chemo chair', audience: 'patient', sessionIds: ['chemo-chair'] },
  { id: 'fatigue', title: 'No energy today', audience: 'patient', sessionIds: ['two-minutes', 'five-minutes'] },
  { id: 'sleep', title: 'Can’t sleep on steroids', audience: 'patient', sessionIds: ['steroid-night'] },
  { id: 'after', title: 'Treatment has ended', audience: 'patient', sessionIds: ['after-the-bell'] },
  { id: 'caregiver', title: 'Looking after someone with cancer', audience: 'caregiver', sessionIds: ['caregiver-pause'] },
];

/* ------------------------------------------------------------------ *
 * My appointments
 *
 * A reader may add the dates of a scan, scan results or chemo. On the day and
 * the day before, the track puts the right session at the top. Dates stay on
 * the phone. Wording below is DRAFT, for the same clinical review.
 * ------------------------------------------------------------------ */

export type AppointmentKind = 'scan' | 'results' | 'infusion';

export const appointmentKinds: { id: AppointmentKind; label: string }[] = [
  { id: 'scan', label: 'Scan' },
  { id: 'results', label: 'Scan results' },
  { id: 'infusion', label: 'Chemo' },
];

/** Which session each kind of appointment brings to the top. */
export const appointmentSession: Record<AppointmentKind, string> = {
  scan: 'scan-day',
  results: 'scan-day',
  infusion: 'chemo-chair',
};

export const appointmentCopy: Record<
  AppointmentKind,
  Record<'today' | 'tomorrow', { headline: string; line: string }>
> = {
  scan: {
    today: {
      headline: 'Scan today',
      line: 'However you’re feeling about it is okay. This is here for the waiting.',
    },
    tomorrow: {
      headline: 'Your scan is tomorrow',
      line: 'The day before can be the hardest part. A few minutes here might help.',
    },
  },
  results: {
    today: {
      headline: 'Results today',
      line: 'Waiting for news is hard. You don’t have to feel calm to sit with it.',
    },
    tomorrow: {
      headline: 'Results tomorrow',
      line: 'It makes sense if your mind keeps going there. Let’s give it somewhere to rest.',
    },
  },
  infusion: {
    today: {
      headline: 'Chemo today',
      line: 'Something to listen to for the long hours in the chair.',
    },
    tomorrow: {
      headline: 'Chemo tomorrow',
      line: 'Chemo Chair will be ready for when you’re there.',
    },
  },
};

/** Shown in the track and on every session's start screen. Draft, for review. */
export const supportDisclaimer = {
  title: 'Support alongside your care',
  body: 'These sessions are for comfort and coping. They are not medical advice, and they do not affect your treatment or its results. Please keep talking with your care team about how you feel, including sleep, tiredness and worry.',
  urgent: 'If you feel unsafe or in crisis, contact your care team or your local emergency number straight away.',
  short: 'Support alongside your care team, not a substitute for it.',
};

const byId = new Map(supportSessions.map((session) => [session.id, session]));

export function getSupportSession(id: string): SupportSession | undefined {
  return byId.get(id);
}
