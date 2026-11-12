'use client';

import * as React from 'react';

import { useAccountStatus } from '@/hooks/use-account';
import { fetchResume, memberId, pushResume, syncSessions, watchResumeChanges } from '@/lib/cloud-sync';
import { mergeRemoteResume } from '@/lib/resume';
import { useApp } from '@/providers/app-provider';

/** Whose practice this phone's history is: the account it last synced with. */
const OWNER_KEY = 'serenity.sync-owner';

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string): void {
  try {
    window.localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // Without storage the next launch simply syncs from scratch.
  }
}

/**
 * Brings this phone and the reader's account level, once per launch and again
 * on signing in: sittings and the places sessions were left go up, and what
 * another phone added comes down. After that, each change follows on its own
 * (see lib/cloud-sync).
 *
 * If a different account was last synced on this phone, its history is not
 * filed under the new one: the phone takes the new account's history instead.
 */
export function CloudSync() {
  const { hydrated, sessions, replaceSessions } = useApp();
  const status = useAccountStatus();
  const sessionsRef = React.useRef(sessions);
  sessionsRef.current = sessions;
  const syncedForRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!hydrated || status !== 'member') return;
    watchResumeChanges();
    let cancelled = false;

    void (async () => {
      const userId = await memberId();
      if (!userId || cancelled || syncedForRef.current === userId) return;
      syncedForRef.current = userId;

      const owner = readOwner();
      const sameReader = owner === null || owner === userId;

      const merged = await syncSessions(sessionsRef.current, sameReader);
      if (cancelled || merged === null) return;
      replaceSessions(merged);

      const remote = await fetchResume();
      if (remote) {
        const newerHere = mergeRemoteResume(remote);
        if (sameReader) await pushResume(newerHere);
      }
      writeOwner(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, status, replaceSessions]);

  // Signing out lets the next sign-in, whoever it is, sync afresh.
  React.useEffect(() => {
    if (status === 'guest') syncedForRef.current = null;
  }, [status]);

  return null;
}
