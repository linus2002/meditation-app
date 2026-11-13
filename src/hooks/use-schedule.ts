'use client';

import * as React from 'react';

import { MAX_SCHEDULES, parseSchedules, type ScheduledSession } from '@/lib/schedule';

/**
 * The reader's scheduled sessions, kept on this device. One shared store, so
 * the calendar and the notification scheduler always agree.
 */

const STORAGE_KEY = 'serenity.schedule.v1';
const EMPTY: ScheduledSession[] = [];

let cache: ScheduledSession[] | null = null;
const listeners = new Set<() => void>();

function load(): ScheduledSession[] {
  if (cache) return cache;
  try {
    cache = parseSchedules(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cache = [];
  }
  return cache;
}

function save(next: ScheduledSession[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Kept for this visit even if storage is blocked.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export type NewSchedule = Omit<ScheduledSession, 'id' | 'createdAt'>;

export function useSchedule() {
  const schedules = React.useSyncExternalStore(subscribe, load, () => EMPTY);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  return React.useMemo(
    () => ({
      schedules,
      ready,
      full: schedules.length >= MAX_SCHEDULES,
      add: (entry: NewSchedule): ScheduledSession | null => {
        const current = load();
        if (current.length >= MAX_SCHEDULES) return null;
        const created: ScheduledSession = {
          ...entry,
          id: `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        };
        save([...current, created]);
        return created;
      },
      remove: (id: string) => save(load().filter((entry) => entry.id !== id)),
      restore: (entry: ScheduledSession) => save([...load().filter((e) => e.id !== entry.id), entry]),
    }),
    [schedules, ready],
  );
}
