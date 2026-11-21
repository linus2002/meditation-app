'use client';

import * as React from 'react';

import { useAccountStatus } from '@/hooks/use-account';
import { listThreads } from '@/lib/support';

/**
 * How many support conversations have a reply the person hasn't opened, for
 * the dot beside Help & support. Asked at most every two minutes, and only for
 * signed-in members (guests can't raise concerns).
 */

const CHECK_EVERY_MS = 2 * 60_000;

let unread = 0;
let checkedAt = 0;
let checking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === unread) return;
  unread = next;
  listeners.forEach((listener) => listener());
}

/** The Help screen reports what it just loaded, so the dot clears straight away. */
export function markSupportSeen(count: number) {
  checkedAt = Date.now();
  set(count);
}

function check() {
  if (checking || Date.now() - checkedAt < CHECK_EVERY_MS) return;
  checking = listThreads()
    .then((result) => markSupportSeen(result.unread))
    .catch(() => {
      // Offline or not set up: no dot, and try again later.
      checkedAt = Date.now();
    })
    .finally(() => {
      checking = null;
    });
}

export function useSupportUnread(): number {
  const status = useAccountStatus();
  const count = React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unread,
    () => 0,
  );

  React.useEffect(() => {
    if (status === 'member') check();
  }, [status]);

  return status === 'member' ? count : 0;
}
