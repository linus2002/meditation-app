'use client';

import * as React from 'react';
import Link from 'next/link';
import { Phone, Send, Trash2 } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { useUndo } from '@/components/layout/undo-toast';
import { SerenityRing } from '@/components/onboarding/serenity-mark';
import { getMeditation } from '@/data/meditations';
import { kapwaQuickReplies, kapwaWelcome, type KapwaAction } from '@/data/kapwa';
import { emergencyLine } from '@/data/safety-lines';
import { formatMinutesLabel } from '@/lib/format';
import { replyTo } from '@/lib/kapwa';
import { supportTrackEnabled } from '@/lib/support-track';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  from: 'kapwa' | 'you';
  text: string;
  actions?: KapwaAction[];
}

/** Kept on this phone only. */
const STORAGE_KEY = 'serenity.kapwa.v1';
const MAX_MESSAGES = 100;
const MAX_LENGTH = 300;
/** A short pause before Kapwa answers, so the reply reads as a reply. */
const TYPING_MS = 700;

function welcome(): ChatMessage {
  return { id: 'welcome', from: 'kapwa', text: kapwaWelcome.text, actions: kapwaWelcome.actions };
}

/**
 * Chat with Kapwa, Serenity's built-in guide. No AI and no network: replies
 * come from `lib/kapwa`, and the conversation stays on the device.
 */
export function KapwaChat() {
  const offerUndo = useUndo();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      setMessages(saved.length > 0 ? saved : [welcome()]);
    } catch {
      setMessages([welcome()]);
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Without storage the chat simply starts fresh next time.
    }
  }, [messages, hydrated]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, typing]);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const send = (value: string) => {
    const text = value.trim().slice(0, MAX_LENGTH);
    if (!text || typing) return;

    const turn = messages.filter((message) => message.from === 'you').length;
    const reply = replyTo(text, { turn, supportTrack: supportTrackEnabled });

    setMessages((current) =>
      [...current, { id: `you-${Date.now()}`, from: 'you' as const, text }].slice(-MAX_MESSAGES),
    );
    setDraft('');
    setTyping(true);

    timer.current = window.setTimeout(() => {
      setMessages((current) =>
        [
          ...current,
          { id: `kapwa-${Date.now()}`, from: 'kapwa' as const, text: reply.text, actions: reply.actions },
        ].slice(-MAX_MESSAGES),
      );
      setTyping(false);
    }, TYPING_MS);
  };

  const clear = () => {
    window.clearTimeout(timer.current);
    setTyping(false);
    const previous = messages;
    setMessages([welcome()]);
    offerUndo({
      message: 'Chat cleared',
      undo: () => {
        setMessages(previous);
        // Written straight back too, in case Undo is tapped after leaving
        // this screen, when the save effect above is no longer mounted.
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
        } catch {
          // Nothing more to do; the chat simply stays cleared.
        }
      },
    });
  };

  return (
    <div className="pb-4">
      <ScreenHeader
        eyebrow="Your Serenity guide"
        title="Kapwa"
        action={
          <button
            type="button"
            onClick={clear}
            aria-label="Clear chat"
            className="-mt-1.5 tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        }
      />

      <div className="mt-4 flex flex-col items-center px-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-pill">
          <SerenityRing className="h-10 w-10" />
        </span>
        <p className="mt-2 text-label leading-relaxed text-ink-faint">
          A simple built-in guide — not a person or an AI. Your chat stays on this phone.
        </p>
      </div>

      <ol aria-live="polite" className="mt-5 space-y-3 px-4">
        {messages.map((message) =>
          message.from === 'kapwa' ? (
            <li key={message.id} className="flex items-end gap-2 pr-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
                <SerenityRing className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-body-sm leading-relaxed text-ink">
                  <span className="sr-only">Kapwa: </span>
                  {message.text}
                </p>
                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <ActionLink key={actionKey(action)} action={action} />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ) : (
            <li key={message.id} className="flex justify-end pl-12">
              <p className="rounded-2xl rounded-br-md bg-action-pill px-3.5 py-2.5 text-body-sm leading-relaxed text-white">
                <span className="sr-only">You: </span>
                {message.text}
              </p>
            </li>
          ),
        )}

        {typing ? (
          <li className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
              <SerenityRing className="h-[18px] w-[18px]" />
            </span>
            <p
              className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3.5"
              aria-label="Kapwa is typing"
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted"
                  style={{ animationDelay: `${dot * 180}ms` }}
                />
              ))}
            </p>
          </li>
        ) : null}
      </ol>

      {hydrated && !typing ? (
        <div className="mt-4 flex flex-wrap gap-2 px-4">
          {kapwaQuickReplies.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => send(quick)}
              className="rounded-full border border-overlay/15 px-3.5 py-2 text-caption text-ink-soft transition-colors hover:bg-overlay/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              {quick}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="mt-4 flex items-end gap-2 px-4"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="kapwa-input" className="sr-only">
          Message Kapwa
        </label>
        <textarea
          id="kapwa-input"
          rows={1}
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          placeholder="Tell Kapwa how you feel…"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-surface px-4 py-3 text-body-sm leading-snug text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        />
        <button
          type="submit"
          disabled={!draft.trim() || typing}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action-pill text-white shadow-pill transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Send className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </form>

      <p className="mt-3 px-6 text-center text-caption leading-relaxed text-ink-muted">
        Kapwa can’t give medical advice. In an emergency, call {emergencyLine.display}.
      </p>

      <div ref={endRef} />
    </div>
  );
}

function actionKey(action: KapwaAction): string {
  if (action.type === 'session') return action.id;
  if (action.type === 'page') return action.href;
  return `tel:${action.line.dial}`;
}

/** A tap-to-go button under one of Kapwa's replies. */
function ActionLink({ action }: { action: KapwaAction }) {
  const className =
    'rounded-full bg-overlay/[0.06] px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:bg-overlay/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

  if (action.type === 'call') {
    // Full width and tall: this is the one action that has to be easy to hit.
    // The number is printed, not hidden behind the link, so it can be dialled
    // by hand on a device where `tel:` opens nothing.
    const { label, display, dial } = action.line;
    return (
      <a
        href={`tel:${dial}`}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-overlay/[0.08] px-4 py-2.5 text-ink transition-colors hover:bg-overlay/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        <Phone className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="flex min-w-0 flex-col">
          <span className="text-body-sm text-ink-soft">Call {label}</span>
          <span className="text-[1rem] font-semibold tabular-nums">{display}</span>
        </span>
      </a>
    );
  }

  if (action.type === 'page') {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  const meditation = getMeditation(action.id);
  if (!meditation) return null;

  return (
    <Link href={`/player/${meditation.id}`} className={cn(className, 'flex items-center gap-1.5')}>
      <span aria-hidden="true">▶</span>
      {meditation.title} · {formatMinutesLabel(meditation.durationSeconds)}
    </Link>
  );
}
