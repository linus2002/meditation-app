'use client';

import * as React from 'react';

import { useAccountStatus } from '@/hooks/use-account';
import { fetchResume, memberId, pushResume, syncSessions, watchResumeChanges } from '@/lib/cloud-sync';
import { mergeRemoteResume } from '@/lib/resume';
import { useApp } from '@/providers/app-provider';

/**
 * Brings this phone and the reader's account level, once per launch and again
 * on signing in: sittings and the places sessions were left go up, and what
 * another phone added comes down. After that, each change follows on its own
 * (see lib/cloud-sync).
 *
 * Only ever this reader's own history: each account has its own store on the
 * phone, and `memberId` refuses any other (see lib/account-scope).
 */
export function CloudSync() {
  const { hydrated, sessions, mergeSessions } = useApp();
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

      const merged = await syncSessions(() => sessionsRef.current);
      if (cancelled || merged === null) return;
      mergeSessions(merged);

      const remote = await fetchResume();
      if (remote) await pushResume(mergeRemoteResume(remote));
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, status, mergeSessions]);

  // Signing out lets the next sign-in, whoever it is, sync afresh.
  React.useEffect(() => {
    if (status === 'guest') syncedForRef.current = null;
  }, [status]);

  return null;
}
