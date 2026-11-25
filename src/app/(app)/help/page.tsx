'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2, MessageCircleQuestion, Plus, Send } from 'lucide-react';

import { GuestHelp } from '@/components/help/guest-help';
import { CHAT_END_CLASS, ChatDock } from '@/components/layout/chat-dock';
import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { Skeleton } from '@/components/shared/skeleton';
import {
  closeThread,
  createThread,
  getThread,
  listThreads,
  newestTime,
  replyToThread,
  SUPPORT_CATEGORIES,
  syncThread,
  supportErrorText,
  takeHelpDraft,
  type SupportCategory,
  type SupportMessage,
  type SupportStatus,
  type SupportThread,
} from '@/lib/support';
import { markSupportSeen } from '@/hooks/use-support-unread';
import { useAccountStatus } from '@/hooks/use-account';
import { accountEmail } from '@/lib/auth';
import { useApp } from '@/providers/app-provider';
import { useAutoGrow } from '@/hooks/use-auto-grow';
import { cn } from '@/lib/utils';

/**
 * Help & support: raise a concern with the Serenity team and read their
 * replies. One screen with three views, chosen by the address so Back works:
 * /help (your conversations), /help?new=1 (a new concern), /help?t=<id> (one).
 */

const MAX_SUBJECT = 120;
const MAX_BODY = 4000;
/** How often an open conversation checks for new messages and typing. */
const LIVE_MS = 2_000;
/** How often the list of conversations refreshes while it's on screen. */
const LIST_MS = 10_000;
/** A keystroke counts as "typing" for this long. */
const TYPING_MS = 4_000;
/** Typing is told to the team at most this often. */
const TYPING_SIGNAL_MS = 2_000;

const statusLabel: Record<SupportStatus, string> = {
  open: 'Waiting for reply',
  answered: 'Replied',
  closed: 'Closed',
};

const statusClass: Record<SupportStatus, string> = {
  open: 'bg-[#E39B2D]/15 text-[#D58A1C]',
  answered: 'bg-[#61A644]/15 text-[#5A9E3E]',
  closed: 'bg-overlay/[0.08] text-ink-muted',
};

function when(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

function StatusPill({ status }: { status: SupportStatus }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-label font-medium leading-none', statusClass[status])}>
      {statusLabel[status]}
    </span>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-tile bg-surface px-4 py-3.5" role="alert">
      <p className="text-body-sm leading-snug text-ink">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-caption font-medium text-aurora-blue underline-offset-2 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** The person's initials: from the name they gave in Profile, else their email. */
function useInitials(): string {
  const { name } = useApp();
  const [email, setEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    void accountEmail()
      .then(setEmail)
      .catch(() => {});
  }, []);
  const source = name?.trim() || email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (parts[0]?.[0] ?? '');
  return initials.toUpperCase() || 'Me';
}

function UserAvatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1D9FDA_0%,#61A644_100%)] text-[0.75rem] font-semibold tracking-[0.02em] text-white"
    >
      {initials}
    </span>
  );
}

/** The Serenity team speaks with the app's own icon. */
function TeamAvatar() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/apple-touch-icon.png"
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-overlay/10"
    />
  );
}

/* ------------------------------------------------------------------ *
 * Your conversations
 * ------------------------------------------------------------------ */

function ThreadList() {
  const router = useRouter();
  const [threads, setThreads] = React.useState<SupportThread[] | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { threads: next, unread } = await listThreads();
      setThreads(next);
      setProblem(null);
      markSupportSeen(unread);
    } catch (error) {
      setProblem(supportErrorText(error));
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const refresh = window.setInterval(onVisible, LIST_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return (
    <div className="px-5">
      <div className="mt-6 rounded-tile bg-surface p-4">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
            <MessageCircleQuestion className="h-5 w-5 text-ink-soft" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-body-sm font-medium leading-tight text-ink">Something on your mind?</p>
            <p className="mt-1 text-label leading-relaxed text-ink-muted">
              Tell us about a problem, a question or an idea. The Serenity team reads every message and
              replies here.
            </p>
          </div>
        </div>
        <GradientButton className="mt-4 h-11 w-full gap-2" onClick={() => router.push('/help?new=1')}>
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Raise a concern
        </GradientButton>
      </div>

      <h2 className="mt-7 text-body-sm font-semibold text-ink">Your conversations</h2>
      <div className="mt-3">
        {problem ? (
          <Problem message={problem} onRetry={() => void load()} />
        ) : threads === null ? (
          <div className="space-y-2.5">
            <Skeleton className="h-[84px]" />
            <Skeleton className="h-[84px]" />
          </div>
        ) : threads.length === 0 ? (
          <p className="rounded-tile bg-surface px-4 py-4 text-label leading-relaxed text-ink-muted">
            Nothing yet. Concerns you raise, and our replies, will appear here.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/help?t=${thread.id}`)}
                  className="flex w-full items-start gap-3 rounded-tile bg-surface px-4 py-3.5 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {thread.unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#1D9FDA]" aria-label="New reply" />
                      ) : null}
                      <p
                        className={cn(
                          'truncate text-body-sm leading-tight text-ink',
                          thread.unread ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {thread.subject}
                      </p>
                    </div>
                    {thread.last_body ? (
                      <p className="mt-1 line-clamp-2 text-label leading-snug text-ink-muted">
                        {thread.last_sender === 'admin' ? 'Serenity team: ' : 'You: '}
                        {thread.last_body}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex items-center gap-2">
                      <StatusPill status={thread.status} />
                      <span className="text-label text-ink-faint">{when(thread.updated_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * A new concern
 * ------------------------------------------------------------------ */

function NewConcern() {
  const router = useRouter();
  const [category, setCategory] = React.useState<SupportCategory>(SUPPORT_CATEGORIES[0]);
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');

  // Started from Kapwa's "Report this reply": open with it filled in.
  React.useEffect(() => {
    const draft = takeHelpDraft();
    if (!draft) return;
    setCategory(draft.category);
    setSubject(draft.subject);
    setBody(draft.body);
  }, []);
  const [sending, setSending] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  const ready = subject.trim().length >= 3 && body.trim().length >= 1 && !sending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSending(true);
    setProblem(null);
    try {
      const { id } = await createThread({ subject: subject.trim(), body: body.trim(), category });
      // Replace the form in history, so Back from the conversation goes to the list.
      router.replace(`/help?t=${id}`);
    } catch (error) {
      setProblem(supportErrorText(error));
      setSending(false);
    }
  };

  return (
    <form className="px-5" onSubmit={submit}>
      <fieldset className="mt-6">
        <legend className="text-label text-ink-muted">What is it about?</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {SUPPORT_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                'rounded-full px-3.5 py-2 text-caption font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                category === item ? 'bg-aurora-blue text-white' : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="support-subject" className="mt-6 block text-label text-ink-muted">
        Subject
      </label>
      <input
        id="support-subject"
        type="text"
        value={subject}
        maxLength={MAX_SUBJECT}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="A short summary"
        className="mt-2 h-12 w-full rounded-full border border-overlay/[0.12] bg-overlay/[0.04] px-4 text-body-sm text-ink outline-none placeholder:text-ink-faint focus:border-overlay/30"
      />

      <label htmlFor="support-body" className="mt-5 block text-label text-ink-muted">
        Message
      </label>
      <textarea
        id="support-body"
        rows={7}
        value={body}
        maxLength={MAX_BODY}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What happened, or what would you like to ask? Details like which session or screen help us help you."
        className="mt-2 w-full resize-none rounded-2xl border border-overlay/[0.12] bg-overlay/[0.04] px-4 py-3 text-body-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-overlay/30"
      />
      <p className="mt-1.5 text-right text-label text-ink-faint">
        {body.length}/{MAX_BODY}
      </p>

      {problem ? (
        <div className="mt-3">
          <Problem message={problem} />
        </div>
      ) : null}

      <GradientButton type="submit" disabled={!ready} className="mt-4 h-12 w-full gap-2">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
        {sending ? 'Sending…' : 'Send to the Serenity team'}
      </GradientButton>
      <p className="mt-3 text-center text-label leading-relaxed text-ink-faint">
        We reply here, usually within a few days. In an emergency, contact your local emergency services.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ *
 * One conversation
 * ------------------------------------------------------------------ */

/** A message on screen: from the server, or one of ours still on its way. */
type ShownMessage = SupportMessage & { pending?: boolean };

/** Adds messages not already shown, oldest first, with ones still sending last. */
function mergeMessages(current: ShownMessage[], incoming: ShownMessage[]): ShownMessage[] {
  const known = new Set(current.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  if (!fresh.length) return current;
  return [...current, ...fresh].sort(
    (a, b) =>
      Number(Boolean(a.pending)) - Number(Boolean(b.pending)) ||
      Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

/** Three bouncing dots, as messaging apps show while the other side writes. */
function TypingBubble() {
  return (
    <li className="flex items-end gap-2 motion-safe:animate-bubble-in">
      <TeamAvatar />
      <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3.5">
        <span className="sr-only">The Serenity team is typing</span>
        <span className="flex h-3 items-center gap-1" aria-hidden="true">
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-ink-muted motion-safe:animate-typing-dot"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </li>
  );
}

function Conversation({ id }: { id: string }) {
  const [thread, setThread] = React.useState<{ subject: string; status: SupportStatus; category: string | null } | null>(null);
  const [messages, setMessages] = React.useState<ShownMessage[] | null>(null);
  const [teamTyping, setTeamTyping] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const replyRef = useAutoGrow(draft);
  const [sendProblem, setSendProblem] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const initials = useInitials();

  // Kept in refs so the live check always sees the latest without restarting.
  const messagesRef = React.useRef<ShownMessage[] | null>(null);
  messagesRef.current = messages;
  const draftRef = React.useRef('');
  draftRef.current = draft;
  const lastKeyRef = React.useRef(0);
  const lastSignalRef = React.useRef(0);
  const syncingRef = React.useRef(false);
  /** Messages there when the screen opened don't animate in; new ones do. */
  const firstIdsRef = React.useRef<Set<string> | null>(null);
  const tempRef = React.useRef(0);
  /**
   * The newest message time the server has sent us. Our own reply is left out:
   * using it would skip anything the team sent in the moment before it.
   */
  const cursorRef = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await getThread(id);
      setThread({ subject: data.thread.subject, status: data.thread.status, category: data.thread.category });
      firstIdsRef.current ??= new Set(data.messages.map((m) => m.id));
      cursorRef.current = newestTime(cursorRef.current, data.messages);
      setMessages((current) => mergeMessages(current ?? [], data.messages));
      setProblem(null);
    } catch (error) {
      setProblem(supportErrorText(error));
    }
  }, [id]);

  const sync = React.useCallback(async () => {
    const shown = messagesRef.current;
    if (!shown || syncingRef.current) return;
    syncingRef.current = true;
    const typing = Boolean(draftRef.current.trim()) && Date.now() - lastKeyRef.current < TYPING_MS;
    if (typing) lastSignalRef.current = Date.now();
    try {
      const data = await syncThread(id, cursorRef.current, typing);
      cursorRef.current = newestTime(cursorRef.current, data.messages);
      setMessages((current) => mergeMessages(current ?? [], data.messages));
      setTeamTyping(data.typing);
      setThread((current) => (current && current.status !== data.status ? { ...current, status: data.status } : current));
    } catch {
      // A missed check is fine: the next one catches up.
    } finally {
      syncingRef.current = false;
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // The live check: every couple of seconds while the screen is in view.
  const opened = thread !== null;
  React.useEffect(() => {
    if (!opened) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const timer = window.setInterval(tick, LIVE_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [opened, sync]);

  // Keep the newest message (or the typing dots) in view, gliding to it once open.
  const count = messages?.length ?? 0;
  const scrolledRef = React.useRef(false);
  React.useEffect(() => {
    if (!count) return;
    endRef.current?.scrollIntoView({ block: 'end', behavior: scrolledRef.current ? 'smooth' : 'auto' });
    scrolledRef.current = true;
  }, [count, teamTyping]);

  const onDraft = (value: string) => {
    setDraft(value);
    lastKeyRef.current = Date.now();
    draftRef.current = value;
    // Tell the team straight away when typing starts, not at the next check.
    if (value.trim() && Date.now() - lastSignalRef.current > TYPING_SIGNAL_MS) void sync();
  };

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // Show it at once, as messaging apps do; it settles when the server has it.
    const tempId = `sending-${++tempRef.current}`;
    const stand: ShownMessage = {
      id: tempId,
      sender: 'user',
      admin_name: null,
      body: text,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...(current ?? []), stand]);
    setDraft('');
    lastKeyRef.current = 0;
    setSendProblem(null);
    try {
      const { message } = await replyToThread(id, text);
      setMessages((current) => mergeMessages((current ?? []).filter((m) => m.id !== tempId), [message]));
      setThread((current) => (current ? { ...current, status: 'open' } : current));
    } catch (error) {
      setMessages((current) => (current ?? []).filter((m) => m.id !== tempId));
      setDraft((current) => current || text);
      setSendProblem(supportErrorText(error));
    }
  };

  const close = async () => {
    try {
      await closeThread(id);
      setThread((current) => (current ? { ...current, status: 'closed' } : current));
    } catch (error) {
      setSendProblem(supportErrorText(error));
    }
  };

  if (problem && !messages) {
    return (
      <div className="mt-6 px-5">
        <Problem message={problem} onRetry={() => void load()} />
      </div>
    );
  }
  if (!thread || !messages) {
    return (
      <div className="mt-6 space-y-3 px-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-16 w-4/5" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-5 px-5">
        <h2 className="text-[1.0625rem] font-semibold leading-snug text-ink">{thread.subject}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill status={thread.status} />
          {thread.category ? <span className="text-label text-ink-faint">{thread.category}</span> : null}
        </div>
      </div>

      <ol className="mt-5 space-y-3.5 px-4" aria-label="Messages">
        {messages.map((message) => {
          const mine = message.sender === 'user';
          return (
            <li
              key={message.id}
              className={cn(
                'flex items-end gap-2',
                mine ? 'justify-end' : 'justify-start',
                firstIdsRef.current?.has(message.id) ? null : 'motion-safe:animate-bubble-in',
              )}
            >
              {mine ? null : <TeamAvatar />}
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-3 transition-opacity duration-200',
                  mine ? 'rounded-br-md bg-aurora-blue text-white' : 'rounded-bl-md bg-surface text-ink',
                  message.pending ? 'opacity-70' : null,
                )}
              >
                <p className={cn('text-label leading-none', mine ? 'text-white/75' : 'text-ink-muted')}>
                  {mine ? 'You' : message.admin_name ? `${message.admin_name} · Serenity team` : 'Serenity team'}
                  {' · '}
                  {message.pending ? 'Sending…' : when(message.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-body-sm leading-relaxed">{message.body}</p>
              </div>
              {mine ? <UserAvatar initials={initials} /> : null}
            </li>
          );
        })}
        {teamTyping ? <TypingBubble /> : null}
      </ol>

      {thread.status === 'closed' ? (
        <p className="mt-5 px-5 text-center text-label leading-relaxed text-ink-faint">
          This conversation is closed. Writing again reopens it.
        </p>
      ) : null}
      <div ref={endRef} className={cn('h-4', CHAT_END_CLASS)} />

      {/* The reply box stays at the foot of the screen, above the tab bar. */}
      <ChatDock>
        <form className="flex items-end gap-2" onSubmit={send}>
          <label htmlFor="support-reply" className="sr-only">
            Your reply
          </label>
          <textarea
            id="support-reply"
            ref={replyRef}
            rows={1}
            value={draft}
            maxLength={MAX_BODY}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              // On a computer, Enter sends and Shift+Enter starts a new line.
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                window.matchMedia('(pointer: fine)').matches
              ) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Write a reply…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-surface px-4 py-3 text-body-sm leading-snug text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aurora-blue text-white shadow-pill transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Send className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </form>
        {sendProblem ? (
          <div className="mt-2">
            <Problem message={sendProblem} />
          </div>
        ) : null}
        {thread.status !== 'closed' ? (
          <button
            type="button"
            onClick={() => void close()}
            className="mx-auto mt-2 block text-caption font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            My concern is resolved, close it
          </button>
        ) : null}
      </ChatDock>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HelpScreen() {
  const params = useSearchParams();
  const threadId = params.get('t');
  const composing = params.get('new') === '1';
  const status = useAccountStatus();

  if (status !== 'member') {
    return (
      <div className="flex flex-1 flex-col pb-6">
        <ScreenHeader eyebrow="Serenity team" title="Help & support" />
        {status === 'guest' ? <GuestHelp /> : <Skeleton className="mx-5 mt-6 h-[240px]" />}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-1 flex-col', threadId ? null : 'pb-6')}>
      <ScreenHeader
        eyebrow="Serenity team"
        title={threadId ? 'Conversation' : composing ? 'Raise a concern' : 'Help & support'}
      />
      {threadId ? <Conversation id={threadId} /> : composing ? <NewConcern /> : <ThreadList />}
    </div>
  );
}

export default function HelpPage() {
  // Reading the address needs a boundary, since these pages are prerendered.
  return (
    <React.Suspense fallback={null}>
      <HelpScreen />
    </React.Suspense>
  );
}
