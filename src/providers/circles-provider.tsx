'use client';

import * as React from 'react';

import * as api from '@/lib/circles/api';
import { CirclesError, type Membership } from '@/lib/circles/api';
import type { Intake } from '@/lib/circles/types';
import { getSupabase, isCirclesConfigured } from '@/lib/supabase/client';

/**
 * The reader's side of Circles: which circles they are in, and the handful of
 * choices that only matter on this device.
 *
 * Supabase is the source of truth for membership. The copy kept here is a
 * cache — enough to show "your circles" with no signal and to keep reminders
 * scheduled — and it lives under its own key, apart from `serenity.state.v1`,
 * so the app's own state stays small and never mixes with server data.
 *
 * Nobody is signed in on launch. An anonymous account is created only when a
 * reader actually joins a circle.
 */

const STORAGE_KEY = 'serenity.circles.v1';

/** Enough stamps to cover weeks of sits; older ones are long out of range. */
const MAX_ACKED = 500;

interface StoredCircles {
  /** Intake answers. Never sent anywhere. */
  intake: Intake | null;
  memberships: Membership[];
  /** Sits already delivered to a circle — see `lib/circles/checkins`. */
  acked: string[];
  /** Members whose answers this reader has chosen not to see. */
  muted: string[];
  /** Let circles know when I sit. On by default, explained at joining. */
  shareSits: boolean;
  /** A reminder before each of my circles' sessions. Off until asked. */
  reminders: boolean;
}

const initialState: StoredCircles = {
  intake: null,
  memberships: [],
  acked: [],
  muted: [],
  shareSits: true,
  reminders: false,
};

export type CirclesStatus = 'unconfigured' | 'loading' | 'ready' | 'offline';

interface CirclesContextValue extends StoredCircles {
  status: CirclesStatus;
  /** True once the stored copy has been read. */
  hydrated: boolean;
  userId: string | null;
  isMember: (circleId: string) => boolean;
  refresh: () => Promise<void>;
  saveIntake: (intake: Intake) => void;
  join: (circleId: string) => Promise<void>;
  leave: (circleId: string) => Promise<void>;
  acknowledge: (keys: string[]) => void;
  toggleMute: (userId: string) => void;
  setShareSits: (on: boolean) => void;
  setReminders: (on: boolean) => void;
  /** Called after the account is deleted: forget everything but the intake. */
  forget: () => void;
}

const CirclesContext = React.createContext<CirclesContextValue | null>(null);

export function CirclesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<StoredCircles>(initialState);
  const [hydrated, setHydrated] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<CirclesStatus>(
    isCirclesConfigured() ? 'loading' : 'unconfigured',
  );

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredCircles>;
        setState((current) => ({ ...current, ...parsed }));
      }
    } catch {
      // Unreadable storage just means starting from nothing.
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A cache; losing it costs a refetch, nothing more.
    }
  }, [state, hydrated]);

  const refresh = React.useCallback(async () => {
    if (!isCirclesConfigured()) {
      setStatus('unconfigured');
      return;
    }
    try {
      const memberships = await api.getMyMemberships();
      setState((current) => ({ ...current, memberships }));
      setStatus('ready');
    } catch (error) {
      setStatus(error instanceof CirclesError && error.code === 'offline' ? 'offline' : 'ready');
    }
  }, []);

  // Follow the account. There is none until someone joins a circle.
  React.useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    let cancelled = false;
    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user.id ?? null);
      if (data.session) void refresh();
      else setStatus('ready');
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  // Coming back to the app is the natural moment to catch up.
  React.useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [userId, refresh]);

  const saveIntake = React.useCallback((intake: Intake) => {
    setState((current) => ({ ...current, intake }));
  }, []);

  const join = React.useCallback(
    async (circleId: string) => {
      const id = await api.ensureSession();
      setUserId(id);
      await api.joinCircle(circleId);
      await refresh();
    },
    [refresh],
  );

  const leave = React.useCallback(
    async (circleId: string) => {
      await api.leaveCircle(circleId);
      setState((current) => ({
        ...current,
        memberships: current.memberships.filter((entry) => entry.circle.id !== circleId),
      }));
      await refresh();
    },
    [refresh],
  );

  const acknowledge = React.useCallback((keys: string[]) => {
    setState((current) => ({
      ...current,
      acked: [...new Set([...current.acked, ...keys])].slice(-MAX_ACKED),
    }));
  }, []);

  const toggleMute = React.useCallback((memberId: string) => {
    setState((current) => ({
      ...current,
      muted: current.muted.includes(memberId)
        ? current.muted.filter((id) => id !== memberId)
        : [...current.muted, memberId],
    }));
  }, []);

  const setShareSits = React.useCallback((on: boolean) => {
    setState((current) => ({ ...current, shareSits: on }));
  }, []);

  const setReminders = React.useCallback((on: boolean) => {
    setState((current) => ({ ...current, reminders: on }));
  }, []);

  const forget = React.useCallback(() => {
    setState((current) => ({ ...initialState, intake: current.intake }));
    setUserId(null);
  }, []);

  const value = React.useMemo<CirclesContextValue>(
    () => ({
      ...state,
      status,
      hydrated,
      userId,
      isMember: (circleId) => state.memberships.some((entry) => entry.circle.id === circleId),
      refresh,
      saveIntake,
      join,
      leave,
      acknowledge,
      toggleMute,
      setShareSits,
      setReminders,
      forget,
    }),
    [
      state,
      status,
      hydrated,
      userId,
      refresh,
      saveIntake,
      join,
      leave,
      acknowledge,
      toggleMute,
      setShareSits,
      setReminders,
      forget,
    ],
  );

  return <CirclesContext.Provider value={value}>{children}</CirclesContext.Provider>;
}

export function useCircles(): CirclesContextValue {
  const context = React.useContext(CirclesContext);
  if (!context) {
    throw new Error('useCircles must be used inside <CirclesProvider>');
  }
  return context;
}
