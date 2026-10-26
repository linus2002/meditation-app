'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, LogOut, Mail } from 'lucide-react';

import { accountEmail, authErrorText, signOut } from '@/lib/auth';

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; email: string; confirming: boolean; busy: boolean; error?: string };

/**
 * The account row on Profile: a way to sign in for anyone who skipped it on
 * the first run, and a way to sign out. Signing out asks once, in place, and
 * says plainly what it keeps: everything recorded on this phone.
 */
export function AccountCard() {
  const [state, setState] = React.useState<State>({ kind: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    void accountEmail()
      .catch(() => null)
      .then((email) => {
        if (cancelled) return;
        setState(email ? { kind: 'signed-in', email, confirming: false, busy: false } : { kind: 'signed-out' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return <div className="h-[68px] rounded-tile bg-surface" aria-hidden="true" />;
  }

  if (state.kind === 'signed-out') {
    return (
      <Link
        href="/login"
        className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
          <Mail className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-medium leading-tight text-ink">Sign in or create an account</span>
          <span className="mt-0.5 block text-label leading-snug text-ink-muted">
            Keeps your name and Circles when you change phones
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-ink-faint" strokeWidth={1.8} />
      </Link>
    );
  }

  const confirmSignOut = async () => {
    setState({ ...state, busy: true, error: undefined });
    try {
      await signOut();
      setState({ kind: 'signed-out' });
    } catch (error) {
      setState({ ...state, busy: false, error: authErrorText(error) });
    }
  };

  return (
    <div className="rounded-tile bg-surface px-4 py-3.5">
      <div className="flex items-center gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
          <Mail className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label leading-snug text-ink-muted">Signed in as</span>
          <span className="block truncate text-body-sm font-medium leading-tight text-ink">{state.email}</span>
        </span>
        {!state.confirming ? (
          <button
            type="button"
            onClick={() => setState({ ...state, confirming: true })}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-caption font-medium text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Sign out
          </button>
        ) : null}
      </div>

      {state.confirming ? (
        <div className="mt-3 border-t border-overlay/[0.08] pt-3">
          <p className="text-label leading-relaxed text-ink-muted">
            Your sessions, streak and favorites stay on this phone. Circles will need you to sign in again.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              autoFocus
              disabled={state.busy}
              onClick={() => setState({ ...state, confirming: false, error: undefined })}
              className="h-10 flex-1 rounded-full border border-overlay/20 text-caption font-medium text-ink transition-colors hover:border-overlay/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={state.busy}
              onClick={() => void confirmSignOut()}
              className="h-10 flex-1 rounded-full bg-ink text-caption font-medium text-canvas transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              {state.busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          {state.error ? (
            <p role="alert" className="mt-2 text-label leading-relaxed text-destructive">
              {state.error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
