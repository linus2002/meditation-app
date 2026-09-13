'use client';

import * as React from 'react';
import Link from 'next/link';
import { Send, Trash2 } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { SerenityRing } from '@/components/onboarding/serenity-mark';
import { getMeditation } from '@/data/meditations';
import { mariaQuickReplies, mariaWelcome, type MariaAction } from '@/data/maria';
import { formatMinutesLabel } from '@/lib/format';
import { replyTo } from '@/lib/maria';
import { supportTrackEnabled } from '@/lib/support-track';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  from: 'maria' | 'you';
  text: string;
  actions?: MariaAction[];
}

/** Kept on this phone only. */
const STORAGE_KEY = 'serenity.maria.v1';
const MAX_MESSAGES = 100;
const MAX_LENGTH = 300;
/** A short pause before Maria answers, so the reply reads as a reply. */
const TYPING_MS = 700;

function welcome(): ChatMessage {
  return { id: 'welcome', from: 'maria', text: mariaWelcome.text, actions: mariaWelcome.actions };
}

/**
 * Chat with Maria, Serenity's built-in guide. No AI and no network: replies
 * come from `lib/maria`, and the conversation stays on the device.
 */
export function MariaChat() {
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
          { id: `maria-${Date.now()}`, from: 'maria' as const, text: reply.text, actions: reply.actions },
        ].slice(-MAX_MESSAGES),
      );
      setTyping(false);
    }, TYPING_MS);
  };

  const clear = () => {
    window.clearTimeout(timer.current);
    setTyping(false);
    setMessages([welcome()]);
  };

  return (
    <div className="pb-4">
      <ScreenHeader
        eyebrow="Your Serenity guide"
        title="Maria"
        action={
          <button
            type="button"
            onClick={clear}
            aria-label="Clear chat"
            className="-mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </button>
        }
      />

      <div className="mt-4 flex flex-col items-center px-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-pill">
          <SerenityRing className="h-10 w-10" />
        </span>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
          A simple built-in guide — not a person or an AI. Your chat stays on this phone.
        </p>
      </div>

      <ol aria-live="polite" className="mt-5 space-y-3 px-4">
        {messages.map((message) =>
          message.from === 'maria' ? (
            <li key={message.id} className="flex items-end gap-2 pr-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
                <SerenityRing className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
                  <span className="sr-only">Maria: </span>
                  {message.text}
                </p>
                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <ActionLink key={action.type === 'session' ? action.id : action.href} action={action} />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ) : (
            <li key={message.id} className="flex justify-end pl-12">
              <p className="rounded-2xl rounded-br-md bg-action-pill px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
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
              aria-label="Maria is typing"
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
          {mariaQuickReplies.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => send(quick)}
              className="rounded-full border border-overlay/15 px-3.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-overlay/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
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
        <label htmlFor="maria-input" className="sr-only">
          Message Maria
        </label>
        <textarea
          id="maria-input"
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
          placeholder="Tell Maria how you feel…"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-surface px-4 py-3 text-[13.5px] leading-snug text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
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

      <p className="mt-3 px-6 text-center text-[11px] leading-relaxed text-ink-faint">
        Maria can’t give medical advice. In an emergency, call your local emergency number.
      </p>

      <div ref={endRef} />
    </div>
  );
}

/** A tap-to-go button under one of Maria's replies. */
function ActionLink({ action }: { action: MariaAction }) {
  const className =
    'rounded-full bg-overlay/[0.06] px-3.5 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-overlay/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

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
