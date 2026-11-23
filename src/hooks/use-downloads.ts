'use client';

import * as React from 'react';

import {
  downloadsSupport,
  formatBytes,
  readStatus,
  removeSession,
  saveSession,
  type DownloadsStatus,
  type DownloadsSupport,
} from '@/lib/offline-downloads';

/**
 * One shared view of what is saved, for every control that shows it.
 *
 * The truth lives in the worker's cache, not in React and not in localStorage:
 * a session is saved exactly when its files are on the device. Mirroring that
 * into stored state would let the two disagree, and the mirror would always be
 * the one lying — claiming a session is ready on the flight where it is not.
 *
 * So this is a small external store that reads the worker and lets every
 * mounted control subscribe, which keeps the button on the player screen and
 * the list on the downloads screen from drifting apart.
 */
interface StoreState {
  status: DownloadsStatus;
  /** Ids currently saving or being removed, so each button can show its own spinner. */
  busy: string[];
  loaded: boolean;
  error: string | null;
  /** The session the error is about, so its own button can say so. */
  failed: string | null;
}

let state: StoreState = {
  status: { sessions: [], bytes: 0 },
  busy: [],
  loaded: false,
  error: null,
  failed: null,
};

const listeners = new Set<() => void>();

function setState(next: Partial<StoreState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot: StoreState = state;

async function refresh(): Promise<void> {
  if (downloadsSupport() !== 'available') {
    setState({ loaded: true });
    return;
  }
  try {
    setState({ status: await readStatus(), loaded: true, error: null });
  } catch {
    // A worker that is not running yet is not an error worth showing; the
    // screen simply reports nothing saved until it answers.
    setState({ loaded: true });
  }
}

async function run(id: string, action: () => Promise<void>, failure: string): Promise<void> {
  if (state.busy.includes(id)) return;

  setState({ busy: [...state.busy, id], error: null, failed: null });
  try {
    await action();
    setState({ status: await readStatus() });
  } catch (error) {
    setState({ error: error instanceof Error ? error.message : failure, failed: id });
  } finally {
    setState({ busy: state.busy.filter((entry) => entry !== id) });
  }
}

export interface DownloadsApi {
  support: DownloadsSupport;
  /** True once the worker has been asked at least once. */
  loaded: boolean;
  sessions: DownloadsStatus['sessions'];
  totalBytes: number;
  totalLabel: string;
  error: string | null;
  /** The error for this session, if its last save or removal failed. */
  errorFor: (id: string) => string | null;
  /** Puts the error away. */
  dismissError: () => void;
  isSaved: (id: string) => boolean;
  isBusy: (id: string) => boolean;
  /** `media`: the recording and artwork addresses beyond the page (see saveSession). */
  save: (id: string, media?: string[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDownloads(): DownloadsApi {
  const snapshot = React.useSyncExternalStore(subscribe, () => state, () => serverSnapshot);

  // Resolved on the client only: `downloadsSupport` reads navigator, which the
  // server render has no view of.
  const [support, setSupport] = React.useState<DownloadsSupport>('unavailable');

  React.useEffect(() => {
    setSupport(downloadsSupport());
    if (!state.loaded) void refresh();
  }, []);

  return {
    support,
    loaded: snapshot.loaded,
    sessions: snapshot.status.sessions,
    totalBytes: snapshot.status.bytes,
    totalLabel: formatBytes(snapshot.status.bytes),
    error: snapshot.error,
    errorFor: (id) => (snapshot.failed === id ? snapshot.error : null),
    dismissError: () => setState({ error: null, failed: null }),
    isSaved: (id) => snapshot.status.sessions.some((entry) => entry.id === id),
    isBusy: (id) => snapshot.busy.includes(id),
    save: (id, media) => run(id, () => saveSession(id, media), 'The session could not be saved.'),
    remove: (id) => run(id, () => removeSession(id), 'The session could not be removed.'),
    refresh,
  };
}
