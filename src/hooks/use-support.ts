'use client';

import * as React from 'react';

import type { AppointmentKind } from '@/data/support-track';
import { toDateKey } from '@/lib/date';
import {
  validateAppointmentDate,
  withAppointment,
  type DateProblem,
} from '@/lib/support-appointments';
import {
  addListen,
  emptySupportState,
  readSupport,
  writeSupport,
  type SupportListen,
  type SupportState,
} from '@/lib/support-history';

/**
 * The support track's own small store: larger text, a private list of what
 * was listened to, and the reader's appointment dates. Use one per screen and
 * pass it down.
 */
export function useSupport() {
  const [state, setState] = React.useState<SupportState>(emptySupportState);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setState(readSupport());
    setHydrated(true);
  }, []);

  const update = React.useCallback((change: (current: SupportState) => SupportState) => {
    setState((current) => {
      const next = change(current);
      writeSupport(next);
      return next;
    });
  }, []);

  const setLargeText = React.useCallback(
    (on: boolean) => update((current) => ({ ...current, largeText: on })),
    [update],
  );

  const recordListen = React.useCallback(
    (listen: SupportListen) =>
      update((current) => ({ ...current, history: addListen(current.history, listen) })),
    [update],
  );

  /** Adds a date, or returns why it cannot be added. */
  const addAppointment = React.useCallback(
    (kind: AppointmentKind, date: string): DateProblem | null => {
      const todayKey = toDateKey(new Date());
      const problem = validateAppointmentDate(date, todayKey);
      if (problem) return problem;
      update((current) => ({
        ...current,
        appointments: withAppointment(current.appointments, kind, date, todayKey),
      }));
      return null;
    },
    [update],
  );

  const removeAppointment = React.useCallback(
    (id: string) =>
      update((current) => ({
        ...current,
        appointments: current.appointments.filter((entry) => entry.id !== id),
      })),
    [update],
  );

  return { ...state, hydrated, setLargeText, recordListen, addAppointment, removeAppointment };
}
