'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { circlesErrorMessage } from '@/components/circles/messages';
import { Switch } from '@/components/ui/switch';
import * as api from '@/lib/circles/api';
import { CirclesError } from '@/lib/circles/api';
import { validateDisplayName } from '@/lib/circles/text';
import type { Circle } from '@/lib/circles/types';
import { requestPermission } from '@/lib/notifications';
import { useCircles } from '@/providers/circles-provider';

const inputClass =
  'w-full rounded-xl bg-overlay/[0.06] px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

const linkButton =
  'text-[12px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 disabled:opacity-60';

function errorText(error: unknown): string {
  return circlesErrorMessage(error instanceof CirclesError ? error.code : 'unknown');
}

/**
 * Everything a member can change: their name, reminders, whether their sits
 * are shared, keeping their place on a new phone, and leaving.
 */
export function CircleSettings({ circle }: { circle: Circle }) {
  const router = useRouter();
  const {
    reminders,
    setReminders,
    shareSits,
    setShareSits,
    muted,
    toggleMute,
    leave,
    forget,
  } = useCircles();

  const [name, setName] = React.useState('');
  const [savedName, setSavedName] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [linkedEmail, setLinkedEmail] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [confirm, setConfirm] = React.useState<'leave' | 'delete' | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    void api.getDisplayName().then((value) => {
      setSavedName(value);
      setName(value ?? '');
    }).catch(() => {});
    void api.getAccountEmail().then(setLinkedEmail).catch(() => {});
  }, []);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const saveName = () =>
    run(async () => {
      const trimmed = name.trim();
      if (trimmed) {
        const problem = validateDisplayName(trimmed);
        if (problem) {
          setMessage(problem === 'too-long' ? 'Keep your name under 32 characters.' : 'That name will not work.');
          return;
        }
      }
      await api.setDisplayName(trimmed || null);
      setSavedName(trimmed || null);
      setMessage('Saved.');
    });

  const toggleReminders = async (next: boolean) => {
    if (!next) {
      setReminders(false);
      return;
    }
    const permission = await requestPermission();
    if (permission === 'granted') setReminders(true);
    else setMessage('Notifications are blocked. Allow them in your settings to get reminders.');
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-tile bg-surface p-4">
        <label htmlFor="circle-name" className="text-[13px] font-medium text-ink">
          Your name in circles
        </label>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">
          Optional. Without one you appear as &ldquo;A member&rdquo;.
        </p>
        <div className="mt-2.5 flex gap-2">
          <input
            id="circle-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="First name or nickname"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void saveName()}
            disabled={busy || name.trim() === (savedName ?? '')}
            className="shrink-0 rounded-full bg-overlay/[0.08] px-4 text-[12px] font-medium text-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <label htmlFor="circle-reminders" className="block text-[13px] font-medium text-ink">
            Remind me before sessions
          </label>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            Ten minutes before each of your circles sits. Nothing else.
          </p>
        </div>
        <Switch id="circle-reminders" checked={reminders} onCheckedChange={(next) => void toggleReminders(next)} />
      </div>

      <div className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <label htmlFor="circle-share" className="block text-[13px] font-medium text-ink">
            Let my circle know when I sit
          </label>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            They see that you sat, never for how long or what. It helps the circle&apos;s streak.
          </p>
        </div>
        <Switch id="circle-share" checked={shareSits} onCheckedChange={setShareSits} />
      </div>

      {muted.length > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-tile bg-surface px-4 py-3.5">
          <p className="text-[12px] text-ink-muted">
            You have hidden answers from {muted.length} {muted.length === 1 ? 'person' : 'people'}.
          </p>
          <button type="button" onClick={() => muted.forEach(toggleMute)} className={linkButton}>
            Show again
          </button>
        </div>
      ) : null}

      <div className="rounded-tile bg-surface p-4">
        <p className="text-[13px] font-medium text-ink">Keep your place on a new phone</p>
        {linkedEmail ? (
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            Linked to {linkedEmail}. Sign in with it on another device to find your circles.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Your circle place lives on this device. Add an email and we will send a code to keep
              it. Optional.
            </p>
            {!codeSent ? (
              <div className="mt-2.5 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  autoComplete="email"
                />
                <button
                  type="button"
                  disabled={busy || !email.includes('@')}
                  onClick={() =>
                    void run(async () => {
                      await api.startEmailLink(email.trim());
                      setCodeSent(true);
                    })
                  }
                  className="shrink-0 rounded-full bg-overlay/[0.08] px-4 text-[12px] font-medium text-ink disabled:opacity-50"
                >
                  Send code
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex gap-2">
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.trim())}
                  placeholder="Code from the email"
                  className={inputClass}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  disabled={busy || code.length < 6}
                  onClick={() =>
                    void run(async () => {
                      await api.confirmEmailLink(email.trim(), code);
                      setLinkedEmail(email.trim());
                    })
                  }
                  className="shrink-0 rounded-full bg-overlay/[0.08] px-4 text-[12px] font-medium text-ink disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-tile bg-surface p-4">
        {confirm === 'leave' ? (
          <>
            <p className="text-[12.5px] text-ink">
              Leave {circle.name}? Days the circle already counted stay counted.
            </p>
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await leave(circle.id);
                    router.push('/circles');
                  })
                }
                className={linkButton}
              >
                Leave
              </button>
              <button type="button" onClick={() => setConfirm(null)} className={linkButton}>
                Stay
              </button>
            </div>
          </>
        ) : confirm === 'delete' ? (
          <>
            <p className="text-[12.5px] text-ink">
              Delete your circles account? You leave every circle and your answers are removed.
              Your own sessions and history in Serenity are not affected.
            </p>
            <div className="mt-3 flex gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api.deleteMyAccount();
                    forget();
                    router.push('/circles');
                  })
                }
                className={linkButton}
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirm(null)} className={linkButton}>
                Keep it
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <button type="button" onClick={() => setConfirm('leave')} className={linkButton}>
              Leave this circle
            </button>
            <button type="button" onClick={() => setConfirm('delete')} className={linkButton}>
              Delete my circles account
            </button>
          </div>
        )}
      </div>

      {message ? <p className="px-1 text-[11.5px] text-ink-muted" role="status">{message}</p> : null}
    </div>
  );
}
