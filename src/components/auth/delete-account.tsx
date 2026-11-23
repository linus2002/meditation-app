'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';

import { useAccountStatus } from '@/hooks/use-account';
import { followAccountChange } from '@/lib/account-change';
import { deleteAccount, type AnalyticsOutcome } from '@/lib/account-deletion';

/** Survives the reload that follows, so the next screen can say it is done. */
const DONE_KEY = 'serenity.account-deleted';
const CONFIRM_WORD = 'DELETE';

/**
 * Deleting the account, at the foot of Profile. Asks for a typed word: this
 * cannot be undone, and a stray tap on a phone must not do it.
 */
export function DeleteAccount() {
  const status = useAccountStatus();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<AnalyticsOutcome | null>(null);

  // Shown once, on the guest screen that follows a deletion.
  React.useEffect(() => {
    try {
      const outcome = window.sessionStorage.getItem(DONE_KEY) as AnalyticsOutcome | null;
      if (outcome) {
        window.sessionStorage.removeItem(DONE_KEY);
        setDone(outcome);
      }
    } catch {
      // No note to show.
    }
  }, []);

  if (done) {
    return (
      <div role="status" className="rounded-tile bg-surface px-4 py-3.5">
        <p className="text-body-sm font-medium text-ink">Your account has been deleted</p>
        <p className="mt-1 text-label leading-relaxed text-ink-muted">
          {done === 'manual'
            ? 'Your sessions, reflections, support conversations and sign-in are gone. Usage data you shared for analytics will be removed by the Serenity team.'
            : 'Your sessions, reflections, support conversations, usage data and sign-in are gone.'}
        </p>
      </div>
    );
  }

  if (status !== 'member') return null;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await deleteAccount();
      try {
        window.sessionStorage.setItem(DONE_KEY, outcome);
      } catch {
        // The note is simply not shown.
      }
      followAccountChange();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your account could not be deleted just now.');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
          <Trash2 className="h-[17px] w-[17px] text-destructive" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-medium leading-tight text-ink">Delete account</span>
          <span className="mt-0.5 block text-label leading-snug text-ink-muted">
            Permanently remove your account and everything kept with it
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-tile bg-surface px-4 py-3.5">
      <p id="delete-title" className="text-body-sm font-semibold text-ink">
        Delete your account?
      </p>
      <p className="mt-1.5 text-label leading-relaxed text-ink-muted">
        This removes your sign-in, the sessions and places synced to it, your ratings and likes,
        your support conversations and your usage data, and everything this account kept on this
        phone. It can’t be undone.
      </p>
      <label htmlFor="delete-confirm" className="mt-3 block text-label text-ink-muted">
        Type {CONFIRM_WORD} to confirm
      </label>
      <input
        id="delete-confirm"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-describedby="delete-title"
        className="mt-1.5 h-11 w-full rounded-xl border border-overlay/[0.12] bg-overlay/[0.04] px-3 text-body-sm text-ink outline-none focus:border-overlay/30"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setTyped('');
            setError(null);
          }}
          className="h-10 flex-1 rounded-full border border-overlay/20 text-caption font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Keep my account
        </button>
        <button
          type="button"
          disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}
          onClick={() => void confirm()}
          className="h-10 flex-1 rounded-full bg-destructive text-caption font-semibold text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          {busy ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-label leading-relaxed text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
