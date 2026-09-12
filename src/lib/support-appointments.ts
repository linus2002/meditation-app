import { appointmentSession, type AppointmentKind } from '@/data/support-track';
import { addDaysToKey } from '@/lib/circles/tz';

/**
 * "My appointments" for the support track: the dates a reader chose to add,
 * and what the track should put first because of them.
 *
 * Pure and clock-injected (`todayKey`), so it is tested directly. The dates
 * are kept on the phone with the rest of the track's private data.
 */

export interface SupportAppointment {
  /** `kind-date`: one appointment of each kind per day. */
  id: string;
  kind: AppointmentKind;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
}

export interface AppointmentSuggestion {
  appointment: SupportAppointment;
  when: 'today' | 'tomorrow';
  sessionId: string;
}

/** Results first, then a scan, then chemo — when two fall on the same day. */
const KIND_ORDER: Record<AppointmentKind, number> = { results: 0, scan: 1, infusion: 2 };

/** Nobody books a scan further out than this; a far-off date is a typo. */
const MAX_DAYS_AHEAD = 366;

const MAX_APPOINTMENTS = 20;

export type DateProblem = 'invalid' | 'past' | 'too-far';

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function validateAppointmentDate(date: string, todayKey: string): DateProblem | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 'invalid';

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return 'invalid';

  if (date < todayKey) return 'past';
  if (dayNumber(date) - dayNumber(todayKey) > MAX_DAYS_AHEAD) return 'too-far';
  return null;
}

/** Only today's and later, soonest first. */
export function upcomingAppointments(
  appointments: SupportAppointment[],
  todayKey: string,
): SupportAppointment[] {
  return appointments
    .filter((entry) => entry.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * Adds an appointment, dropping past ones and duplicates on the way. The
 * caller validates the date first with `validateAppointmentDate`.
 */
export function withAppointment(
  appointments: SupportAppointment[],
  kind: AppointmentKind,
  date: string,
  todayKey: string,
): SupportAppointment[] {
  const id = `${kind}-${date}`;
  return upcomingAppointments(
    [...appointments.filter((entry) => entry.id !== id), { id, kind, date }],
    todayKey,
  ).slice(0, MAX_APPOINTMENTS);
}

/**
 * What to put first on the Support screen: an appointment today or tomorrow,
 * each paired with the session made for it. Today's come before tomorrow's.
 */
export function appointmentSuggestions(
  appointments: SupportAppointment[],
  todayKey: string,
): AppointmentSuggestion[] {
  const tomorrowKey = addDaysToKey(todayKey, 1);

  return appointments
    .filter((entry) => entry.date === todayKey || entry.date === tomorrowKey)
    .map((appointment) => ({
      appointment,
      when: appointment.date === todayKey ? ('today' as const) : ('tomorrow' as const),
      sessionId: appointmentSession[appointment.kind],
    }))
    .sort((a, b) =>
      a.when === b.when
        ? KIND_ORDER[a.appointment.kind] - KIND_ORDER[b.appointment.kind]
        : a.when === 'today'
          ? -1
          : 1,
    );
}
