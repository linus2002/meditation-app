'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { circlesErrorMessage } from '@/components/circles/messages';
import * as api from '@/lib/circles/api';
import { CirclesError, type CircleToday } from '@/lib/circles/api';
import type { ResponseRow } from '@/lib/circles/feed';
import { ANSWER_MAX, characterCount, validateAnswer } from '@/lib/circles/text';

const problemCopy = {
  empty: 'Write a few words first.',
  'too-long': `Keep it under ${ANSWER_MAX} characters.`,
  link: 'Links are not allowed here.',
} as const;

/**
 * Today's one-line prompt. One answer a day, editable, visible only to the
 * circle. Enter saves; there is no second line to write.
 */
export function TodayPromptCard({
  circleId,
  today,
  myAnswer,
  onSaved,
}: {
  circleId: string;
  today: CircleToday;
  myAnswer: ResponseRow | undefined;
  onSaved: () => void;
}) {
  const [draft, setDraft] = React.useState(myAnswer?.body ?? '');
  const [editing, setEditing] = React.useState(!myAnswer);
  const [saving, setSaving] = React.useState(false);
  const [confirmingRemove, setConfirmingRemove] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(myAnswer?.body ?? '');
    setEditing(!myAnswer);
  }, [myAnswer]);

  if (!today.question) return null;

  const save = async () => {
    const problem = validateAnswer(draft);
    if (problem) {
      setMessage(problemCopy[problem]);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.answerPrompt(circleId, draft);
      setEditing(false);
      onSaved();
    } catch (error) {
      setMessage(circlesErrorMessage(error instanceof CirclesError ? error.code : 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteAnswer(circleId, today.today);
      setDraft('');
      onSaved();
    } catch (error) {
      setMessage(circlesErrorMessage(error instanceof CirclesError ? error.code : 'unknown'));
    } finally {
      setSaving(false);
    }
  };

  const count = characterCount(draft);

  return (
    <div className="rounded-tile bg-surface p-4">
      <p className="text-label leading-none text-ink-faint">Today&apos;s prompt</p>
      <p className="mt-2 text-body-sm font-medium leading-snug text-ink">{today.question}</p>

      {editing ? (
        <>
          <label htmlFor="circle-answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="circle-answer"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
            placeholder="One line, for your circle"
            className="mt-3 w-full resize-none rounded-xl bg-overlay/[0.06] px-3.5 py-3 text-body-sm leading-snug text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span
              className={count > ANSWER_MAX ? 'text-label text-ink' : 'text-label text-ink-faint'}
            >
              {count}/{ANSWER_MAX}
            </span>
            <div className="flex items-center gap-2">
              {myAnswer ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(myAnswer.body);
                    setEditing(false);
                  }}
                  className="rounded-full px-3 py-1.5 text-caption text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-full bg-action-pill px-4 py-1.5 text-caption font-medium text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} /> : null}
                Share
              </button>
            </div>
          </div>
        </>
      ) : myAnswer ? (
        <div className="mt-3">
          <p className="rounded-xl bg-overlay/[0.05] px-3.5 py-3 text-body-sm leading-snug text-ink-soft">
            {myAnswer.body}
          </p>
          {myAnswer.hidden ? (
            <p className="mt-2 text-label text-ink-faint">
              Hidden from the circle after reports. Only you can see it.
            </p>
          ) : null}
          {/*
           * Removing takes the answer off the circle's server, so it is asked
           * first rather than undone after.
           */}
          {confirmingRemove ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-caption text-ink-soft">Remove your answer for today?</p>
              <button
                type="button"
                onClick={() => {
                  setConfirmingRemove(false);
                  void remove();
                }}
                disabled={saving}
                className="tap-target text-caption font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="tap-target text-caption text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                Keep it
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="tap-target text-caption text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingRemove(true)}
                disabled={saving}
                className="tap-target text-caption text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : null}

      {message ? <p className="mt-2 text-label text-ink-muted">{message}</p> : null}

      <p className="mt-3 text-label leading-relaxed text-ink-faint">
        Only your circle sees answers. If you are having a hard time, please talk to someone you
        trust or a local support line. A circle is not a crisis service.
      </p>
    </div>
  );
}
