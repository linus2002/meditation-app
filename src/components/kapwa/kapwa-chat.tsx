'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AudioLines, BookOpen, Flag, Leaf, PersonStanding, Phone, Play, Send, Trash2 } from 'lucide-react';

import { CHAT_END_CLASS, ChatDock } from '@/components/layout/chat-dock';
import { ScreenHeader } from '@/components/layout/screen-header';
import { useUndo } from '@/components/layout/undo-toast';
import { KapwaIcon } from '@/components/kapwa/kapwa-icon';
import { PracticeRunner } from '@/components/kapwa/practice-runner';
import { allSessions, getMeditation, meditations } from '@/data/meditations';
import { programs } from '@/data/programs';
import { getStory, stories } from '@/data/stories';
import { getYogaSession, yogaSessions } from '@/data/yoga';
import {
  crisisReply,
  kapwaQuickReplies,
  kapwaWelcome,
  type KapwaAction,
} from '@/data/kapwa';
import { settingToggles } from '@/data/settings';
import { appShortcuts } from '@/data/shortcuts';
import { soundscapes } from '@/lib/audio/soundscapes';
import { formatMinutesLabel } from '@/lib/format';
import { estimatedMinutes } from '@/lib/story';
import { totalSeconds } from '@/lib/yoga';
import {
  heldReply,
  replySignalsRisk,
  replyTo,
  safetyHold,
  safetyKind,
  type SafetyKind,
} from '@/lib/kapwa';
import { personalKey, storedAccount } from '@/lib/account-scope';
import { readActivity, readConsent, setConsent } from '@/lib/activity-log';
import { buildHistory, kapwaAiEnabled, streamKapwaReply, warmUpKapwaAi } from '@/lib/kapwa-ai';
import { buildKapwaContext, findSessionTitles, parseSessionLine } from '@/lib/kapwa-context';
import { converse, type DialogueMemory, type DialogueTurn } from '@/lib/kapwa-dialogue';
import { getPractice, practiceAsk, practiceLabel } from '@/lib/kapwa-knowledge';
import type { KapwaProfile, PersonalConsent } from '@/lib/kapwa-profile';
import { canRun } from '@/lib/kapwa-runner';
import { HELP_DRAFT_KEY } from '@/lib/support';
import { currentStreak } from '@/lib/session-stats';
import { supportTrackEnabled } from '@/lib/support-track';
import { useAutoGrow } from '@/hooks/use-auto-grow';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

interface ChatMessage {
  id: string;
  from: 'kapwa' | 'you';
  text: string;
  actions?: KapwaAction[];
  /** Questions to go on with, offered as buttons while this is the latest reply. */
  suggestions?: string[];
  /** On Kapwa's messages: where the conversation stands, so the next message is read in context. */
  memory?: DialogueMemory;
  /** Part of a crisis or medical exchange: never sent to the AI. */
  private?: boolean;
  /** On the reader's message: the risk seen in it, and when, for `safetyHold`. */
  safety?: SafetyKind;
  at?: number;
}

/** Kept on this phone only. */
const STORAGE_KEY = 'serenity.kapwa.v1';
const MAX_MESSAGES = 100;
const MAX_LENGTH = 300;
/**
 * A brief pause before Kapwa answers, just long enough to read as a reply.
 * The answer itself takes a few milliseconds; this is the only wait.
 */
const TYPING_MS = 250;
/** And before the one question that follows an answer, so it reads as its own message. */
const FOLLOW_UP_MS = 450;

/** Kapwa's first message, by name when the reader has given one. */
function welcome(name?: string): ChatMessage {
  const text = name ? kapwaWelcome.text.replace(/^Hi, I’m Kapwa\./, `Hi ${name}, I’m Kapwa.`) : kapwaWelcome.text;
  return { id: 'welcome', from: 'kapwa', text, actions: kapwaWelcome.actions };
}


/**
 * Chat with Kapwa, Serenity's guide. Replies come from the dialogue manager
 * (`lib/kapwa-dialogue`) on the device, which reads each message against
 * where the conversation stands. With NEXT_PUBLIC_KAPWA_AI set, messages it
 * has no written answer for go to the AI (`lib/kapwa-ai`). Crisis and
 * medical messages never do. The conversation is stored on the device only.
 */
export function KapwaChat() {
  const offerUndo = useUndo();
  const router = useRouter();
  const app = useApp();
  const { sessions, favorites } = app;
  /** Whether the reader lets Kapwa use their activity; asked the first time it matters. */
  const [consent, setConsentState] = React.useState<PersonalConsent>(undefined);
  /** The practice being guided in time, if any. */
  const [running, setRunning] = React.useState<string | null>(null);
  /** What the AI knows about the app and this reader's progress. */
  const appContext = React.useMemo(
    () =>
      buildKapwaContext({
        meditations,
        programs,
        stories,
        yoga: yogaSessions,
        sessions,
        favorites,
        streakDays: currentStreak(sessions, new Date()),
        settings: settingToggles,
        shortcuts: appShortcuts,
      }),
    [sessions, favorites],
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = useAutoGrow(draft);
  const [typing, setTyping] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const aiRequest = React.useRef<AbortController | null>(null);
  /** The AI reply being written; the typing dots give way to it. */
  const [streamingId, setStreamingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(personalKey(STORAGE_KEY));
      const saved = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      setMessages(saved.length > 0 ? saved : [welcome(app.name)]);
    } catch {
      setMessages([welcome(app.name)]);
    }
    setConsentState(readConsent());
    setHydrated(true);
    // Read once, on opening; the name only shapes the first greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The reader's own data on this phone, read fresh for each message. */
  const profile = (): KapwaProfile => {
    const activity = readActivity();
    return {
      name: app.name,
      email: storedAccount()?.email,
      sessions: app.sessions,
      favorites: app.favorites,
      favoriteStories: app.favoriteStories,
      goalMinutes: app.goalMinutes,
      sleepLogs: app.sleepLogs,
      reflections: app.reflections.length,
      screens: activity.screens,
      previousVisitAt: activity.previousVisitAt,
      now: Date.now(),
    };
  };

  /** Applies what a reply asks of the chat: the reader's consent, or the name they gave. */
  const applyEffects = (effects: DialogueTurn['effects']) => {
    if (effects?.consent) {
      setConsent(effects.consent);
      setConsentState(effects.consent);
    }
    if (effects?.name) app.setName(effects.name);
  };

  // A local model can take minutes to load, so start before the first message.
  const warmedUp = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || warmedUp.current) return;
    warmedUp.current = true;
    warmUpKapwaAi(appContext);
  }, [hydrated, appContext]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(personalKey(STORAGE_KEY), JSON.stringify(messages));
    } catch {
      // Without storage the chat simply starts fresh next time.
    }
  }, [messages, hydrated]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, typing, running]);

  React.useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      aiRequest.current?.abort();
    },
    [],
  );

  const send = (value: string) => {
    const text = value.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    // Never make someone wait to be heard: a new message cuts short whatever
    // Kapwa was in the middle of saying.
    window.clearTimeout(timer.current);
    aiRequest.current?.abort();
    setStreamingId(null);

    const now = Date.now();
    const risk = safetyKind(text);
    const held = safetyHold(messages, now);
    const asked: ChatMessage = { id: `you-${now}`, from: 'you', text };
    setDraft('');

    // Crisis and medical replies are fixed, never go to the AI, and come at
    // once: a pause would be lost if the reader left the screen during it.
    // A medical sign during a crisis must not take the crisis lines away.
    const kind = held === 'crisis' ? held : (risk ?? held);
    if (kind) {
      const answer = kind === risk ? replyTo(text) : heldReply(kind);
      setTyping(false);
      setMessages((current) =>
        [
          ...current,
          // Only fresh risk restarts the hold, or it would never run out.
          { ...asked, private: true, ...(risk ? { safety: risk, at: now } : {}) },
          {
            id: `kapwa-${now}`,
            from: 'kapwa' as const,
            text: answer.text,
            actions: answer.actions,
            private: true,
            memory: { state: 'safety' as const, intentId: answer.intentId },
          },
        ].slice(-MAX_MESSAGES),
      );
      return;
    }

    const turn = messages.filter((message) => message.from === 'you').length;
    const lastKapwa = [...messages].reverse().find((message) => message.from === 'kapwa');
    const reply = converse(text, {
      last: lastKapwa?.memory,
      earlier: messages.flatMap((message) => (message.memory ? [message.memory.intentId] : [])),
      turn,
      supportTrack: supportTrackEnabled,
      profile: profile(),
      personal: consent,
    });
    applyEffects(reply.effects);
    setRunning(null);

    setMessages((current) => [...current, asked].slice(-MAX_MESSAGES));
    setTyping(true);

    // A written answer to a common question is given as written, even with
    // the AI on: it is checked, consistent and instant.
    if (kapwaAiEnabled && !reply.prepared) {
      void sendToAi(text, reply);
      return;
    }

    const add = (message: ChatMessage) => setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
    timer.current = window.setTimeout(() => {
      add({
        id: `kapwa-${Date.now()}`,
        from: 'kapwa',
        text: reply.text,
        actions: reply.actions,
        suggestions: reply.suggestions,
        memory: reply.memory,
      });
      if (!reply.followUp) {
        setTyping(false);
        return;
      }
      // The one question that follows, as its own message.
      timer.current = window.setTimeout(() => {
        add({
          id: `kapwa-${Date.now()}-next`,
          from: 'kapwa',
          text: reply.followUp!,
          suggestions: reply.suggestions,
          memory: reply.memory,
        });
        setTyping(false);
      }, FOLLOW_UP_MS);
    }, TYPING_MS);
  };

  /**
   * Streams the AI's reply into a new bubble. The keyword match still decides
   * which sessions and screens to offer underneath it, and is the whole reply
   * if the AI can't answer (offline, over quota, or any error).
   */
  const sendToAi = async (text: string, fallback: DialogueTurn) => {
    const controller = new AbortController();
    aiRequest.current?.abort();
    aiRequest.current = controller;
    const id = `kapwa-${Date.now()}`;
    const actions = fallback.intentId === 'fallback' ? [] : fallback.actions;
    let started = false;

    const show = (replyText: string, withActions?: KapwaAction[], isPrivate?: boolean, suggestions?: string[]) =>
      setMessages((current) => {
        const bubble: ChatMessage = {
          id,
          from: 'kapwa',
          text: replyText,
          actions: withActions,
          suggestions,
          private: isPrivate,
          memory: isPrivate ? { state: 'safety', intentId: 'crisis' } : fallback.memory,
        };
        const exists = current.some((message) => message.id === id);
        return (exists
          ? current.map((message) => (message.id === id ? bubble : message))
          : [...current, bubble]
        ).slice(-MAX_MESSAGES);
      });

    try {
      const full = await streamKapwaReply(
        buildHistory(messages, text),
        appContext,
        (soFar) => {
          if (controller.signal.aborted) return;
          const visible = parseSessionLine(soFar).text;
          if (!visible) return;
          if (!started) {
            started = true;
            setStreamingId(id);
          }
          show(visible);
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        const parsed = parseSessionLine(full);
        const named = parsed.ids.filter((sessionId) => getMeditation(sessionId));
        const ids = named.length > 0 ? named : findSessionTitles(parsed.text, allSessions);
        const picked: KapwaAction[] = ids
          .slice(0, 4)
          .map((sessionId) => ({ type: 'session', id: sessionId }));
        if (!parsed.text) throw new Error('empty reply');
        if (replySignalsRisk(parsed.text)) show(parsed.text, crisisReply.actions, true);
        else show(parsed.text, picked.length > 0 ? picked : actions, false, fallback.suggestions);
      }
    } catch {
      if (!controller.signal.aborted) show(fallback.text, fallback.actions, false, fallback.suggestions);
    } finally {
      if (aiRequest.current === controller) aiRequest.current = null;
      if (!controller.signal.aborted) {
        setStreamingId(null);
        setTyping(false);
      }
    }
  };

  /** A guided run ended: ask how it went, as Kapwa does after any practice. */
  const finishRun = (practiceId: string, completed: boolean) => {
    setRunning(null);
    const lastKapwa = [...messages].reverse().find((message) => message.from === 'kapwa');
    const reply = converse('done', {
      last: { state: 'exercise', intentId: `practice:${practiceId}`, practiceId, topicId: lastKapwa?.memory?.topicId },
      turn: messages.length,
    });
    // Stopped early: no "well done", just permission and the same question.
    const text = completed ? reply.text : 'That’s fine; stopping is always allowed. How are you feeling now?';
    setMessages((current) =>
      [
        ...current,
        {
          id: `kapwa-${Date.now()}`,
          from: 'kapwa' as const,
          text,
          suggestions: reply.suggestions,
          memory: reply.memory,
        },
      ].slice(-MAX_MESSAGES),
    );
  };

  /** Opens Help with a report about one of Kapwa's replies, ready to edit and send. */
  const report = (message: ChatMessage) => {
    try {
      window.sessionStorage.setItem(
        HELP_DRAFT_KEY,
        JSON.stringify({
          category: 'Something isn’t working',
          subject: 'A Kapwa reply',
          body: `Kapwa said:\n“${message.text.slice(0, 600)}”\n\nWhat was wrong or unhelpful:\n`,
        }),
      );
    } catch {
      // Help still opens, with an empty form.
    }
    router.push('/help?new=1');
  };

  const toggleActivity = () => {
    const next = consent === 'yes' ? 'no' : 'yes';
    setConsent(next);
    setConsentState(next);
  };

  const clear = () => {
    window.clearTimeout(timer.current);
    aiRequest.current?.abort();
    setStreamingId(null);
    setTyping(false);
    const previous = messages;
    setRunning(null);
    setMessages([welcome(app.name)]);
    offerUndo({
      message: 'Chat cleared',
      undo: () => {
        setMessages(previous);
        // Written straight back too, in case Undo is tapped after leaving
        // this screen, when the save effect above is no longer mounted.
        try {
          window.localStorage.setItem(personalKey(STORAGE_KEY), JSON.stringify(previous));
        } catch {
          // Nothing more to do; the chat simply stays cleared.
        }
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
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
          <KapwaIcon className="h-10 w-10" />
        </span>
        <p className="mt-2 text-label leading-relaxed text-ink-faint">
          {kapwaAiEnabled
            ? 'An AI guide — not a person or a therapist. Messages are sent to our AI service to reply, and the chat history is kept on this phone.'
            : 'A simple built-in guide — not a person or an AI. Your chat stays on this phone.'}
        </p>
        {hydrated && consent ? (
          <p className="mt-1 text-label leading-relaxed text-ink-faint">
            {consent === 'yes'
              ? 'Kapwa can see your sessions and recent screens on this phone. '
              : 'Kapwa isn’t using your activity. '}
            <button
              type="button"
              onClick={toggleActivity}
              className="inline-block py-1 font-semibold text-ink-soft underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              {consent === 'yes' ? 'Turn off' : 'Turn on'}
            </button>
          </p>
        ) : null}
      </div>

      <ol aria-live="polite" className="mt-5 space-y-3 px-4">
        {messages.map((message) =>
          message.from === 'kapwa' ? (
            <li key={message.id} className="flex items-end gap-2 pr-8">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
                <KapwaIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="whitespace-pre-line rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-body-sm leading-relaxed text-ink">
                  <span className="sr-only">Kapwa: </span>
                  {message.text}
                </p>
                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <ActionLink
                        key={actionKey(action)}
                        action={action}
                        onAsk={send}
                        onRun={(id) => setRunning(id)}
                      />
                    ))}
                  </div>
                ) : null}
                {message.id !== 'welcome' && !message.id.endsWith('-next') ? (
                  <button
                    type="button"
                    onClick={() => report(message)}
                    className="mt-1 flex items-center gap-1 py-1 text-label text-ink-faint transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                  >
                    <Flag className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" />
                    Report this reply
                  </button>
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

        {typing && !streamingId ? (
          <li className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
              <KapwaIcon className="h-[18px] w-[18px]" />
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

      {running && getPractice(running) ? (
        <div className="mt-4">
          <PracticeRunner
            key={running}
            practice={getPractice(running)!}
            onFinish={(completed) => finishRun(running, completed)}
          />
        </div>
      ) : null}

      {hydrated && !typing && !running && !safetyHold(messages, Date.now()) ? (
        <div className="mt-4 flex flex-wrap gap-2 px-4">
          {chipsFor(messages).map((quick) => (
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

      <div ref={endRef} className={CHAT_END_CLASS} />

      {/* The message box stays at the foot of the screen, above the tab bar. */}
      <ChatDock>
      <form
        className="flex items-end gap-2"
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
          ref={inputRef}
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
          disabled={!draft.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aurora-blue text-white shadow-pill transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Send className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
      </form>
      </ChatDock>
    </div>
  );
}

/**
 * The buttons under the chat: what the latest reply suggests asking next,
 * or the openers when it suggests nothing (the welcome, a simple reply).
 */
function chipsFor(messages: ChatMessage[]): string[] {
  const latest = messages[messages.length - 1];
  if (latest?.from === 'kapwa' && latest.suggestions && latest.suggestions.length > 0) return latest.suggestions;
  return kapwaQuickReplies;
}

function actionKey(action: KapwaAction): string {
  if (action.type === 'page') return action.href;
  if (action.type === 'call') return `tel:${action.line.dial}`;
  return `${action.type}:${action.id}`;
}

/**
 * A button under one of Kapwa's replies: most go somewhere in the app; a
 * practice asks Kapwa for it, so its steps are shown right in the chat.
 */
function ActionLink({
  action,
  onAsk,
  onRun,
}: {
  action: KapwaAction;
  onAsk: (text: string) => void;
  onRun: (practiceId: string) => void;
}) {
  const className =
    'rounded-full bg-overlay/[0.06] px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:bg-overlay/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

  if (action.type === 'run') {
    const practice = getPractice(action.id);
    if (!practice || !canRun(practice)) return null;
    return (
      <button
        type="button"
        onClick={() => onRun(practice.id)}
        className={cn(className, 'flex items-center gap-1.5 bg-aurora-blue text-white hover:bg-aurora-blue/90')}
      >
        <Play className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Start, guided · {practice.minutes} min
      </button>
    );
  }

  if (action.type === 'practice') {
    const practice = getPractice(action.id);
    if (!practice) return null;
    return (
      <button
        type="button"
        onClick={() => onAsk(practiceAsk(practice))}
        className={cn(className, 'flex items-center gap-1.5 bg-aurora-blue/15 hover:bg-aurora-blue/25')}
      >
        <Leaf className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
        {practiceLabel(practice)}
      </button>
    );
  }

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

  const target = actionTarget(action);
  if (!target) return null;

  return (
    <Link href={target.href} className={cn(className, 'flex items-center gap-1.5')}>
      <target.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span className="sr-only">{target.kind}: </span>
      {target.label}
    </Link>
  );
}

/** Where a meditation, yoga, story or sound button goes, and what it says. Null once removed from the content. */
function actionTarget(
  action: Extract<KapwaAction, { type: 'session' | 'yoga' | 'story' | 'sound' }>,
): { href: string; label: string; kind: string; Icon: typeof Play } | null {
  if (action.type === 'session') {
    const meditation = getMeditation(action.id);
    if (!meditation) return null;
    return {
      href: `/player/${meditation.id}`,
      label: `${meditation.title} · ${formatMinutesLabel(meditation.durationSeconds)}`,
      kind: 'Meditation',
      Icon: Play,
    };
  }
  if (action.type === 'yoga') {
    const session = getYogaSession(action.id);
    if (!session) return null;
    return {
      href: `/yoga/${session.id}`,
      label: `${session.title} · ${formatMinutesLabel(totalSeconds(session.poses))}`,
      kind: 'Yoga',
      Icon: PersonStanding,
    };
  }
  if (action.type === 'story') {
    const found = getStory(action.id);
    if (!found) return null;
    return {
      href: `/stories/${found.id}`,
      // As the story cards show it.
      label: `${found.title} · ${estimatedMinutes(found)} Min.`,
      kind: 'Story',
      Icon: BookOpen,
    };
  }
  const meta = soundscapes[action.id];
  if (!meta) return null;
  // The Sleep tab's mixer is where every sound is played.
  return { href: '/sleep', label: `${meta.name} sound`, kind: 'Sound', Icon: AudioLines };
}
