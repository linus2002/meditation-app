import { describe, expect, it } from 'vitest';

import {
  appointmentSuggestions,
  upcomingAppointments,
  validateAppointmentDate,
  withAppointment,
  type SupportAppointment,
} from '@/lib/support-appointments';

const today = '2026-09-12';

const appt = (kind: SupportAppointment['kind'], date: string): SupportAppointment => ({
  id: `${kind}-${date}`,
  kind,
  date,
});

describe('appointmentSuggestions', () => {
  it('brings Scan Day Companion forward the day before a scan', () => {
    expect(appointmentSuggestions([appt('scan', '2026-09-13')], today)).toEqual([
      { appointment: appt('scan', '2026-09-13'), when: 'tomorrow', sessionId: 'scan-day' },
    ]);
  });

  it('brings Chemo Chair forward on the day of chemo', () => {
    const [first] = appointmentSuggestions([appt('infusion', today)], today);
    expect(first).toMatchObject({ when: 'today', sessionId: 'chemo-chair' });
  });

  it('uses Scan Day Companion for results too', () => {
    const [first] = appointmentSuggestions([appt('results', today)], today);
    expect(first.sessionId).toBe('scan-day');
  });

  it('ignores appointments further away, or already past', () => {
    expect(
      appointmentSuggestions([appt('scan', '2026-09-15'), appt('results', '2026-09-11')], today),
    ).toEqual([]);
  });

  it('puts today before tomorrow, and results before chemo on the same day', () => {
    const order = appointmentSuggestions(
      [appt('scan', '2026-09-13'), appt('infusion', today), appt('results', today)],
      today,
    ).map((entry) => entry.appointment.id);
    expect(order).toEqual(['results-2026-09-12', 'infusion-2026-09-12', 'scan-2026-09-13']);
  });
});

describe('validateAppointmentDate', () => {
  it('accepts today and later', () => {
    expect(validateAppointmentDate(today, today)).toBeNull();
    expect(validateAppointmentDate('2026-12-01', today)).toBeNull();
  });

  it('refuses the past, far-off typos and dates that do not exist', () => {
    expect(validateAppointmentDate('2026-09-11', today)).toBe('past');
    expect(validateAppointmentDate('2028-01-01', today)).toBe('too-far');
    expect(validateAppointmentDate('2026-02-30', today)).toBe('invalid');
    expect(validateAppointmentDate('next week', today)).toBe('invalid');
  });
});

describe('withAppointment', () => {
  it('keeps one appointment of each kind per day', () => {
    const once = withAppointment([], 'scan', '2026-09-20', today);
    const twice = withAppointment(once, 'scan', '2026-09-20', today);
    expect(twice).toHaveLength(1);
  });

  it('drops past appointments and keeps the rest soonest first', () => {
    const list = withAppointment([appt('scan', '2026-09-01'), appt('infusion', '2026-09-30')], 'results', '2026-09-14', today);
    expect(list.map((entry) => entry.date)).toEqual(['2026-09-14', '2026-09-30']);
  });
});

describe('upcomingAppointments', () => {
  it('shows today onwards, soonest first', () => {
    expect(
      upcomingAppointments([appt('infusion', '2026-09-20'), appt('scan', today), appt('scan', '2026-09-01')], today).map(
        (entry) => entry.date,
      ),
    ).toEqual([today, '2026-09-20']);
  });
});
