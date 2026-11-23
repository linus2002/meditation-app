import * as React from 'react';
import { Badge, Box, Button, Card, Flex, Heading, Spinner, Stack, Text, TextArea, TextInput } from '@sanity/ui';
import { useToast } from '@sanity/ui/toast';
import { CommentIcon } from '@sanity/icons/Comment';
import { RefreshIcon } from '@sanity/icons/Refresh';
import { SearchIcon } from '@sanity/icons/Search';
import { useClient, useCurrentUser, type Tool } from 'sanity';

/**
 * Serenity's Support tab: the concerns people raise from the app's Help &
 * support screen, and the replies to them.
 *
 * The conversations live in Neon, not in Sanity. This tab reads and writes
 * them through /support-api: a Vercel function (api/support-admin.ts) when
 * hosted, which only answers members of this Sanity project, and the dev
 * server (supportProxy.ts) locally. The browser never holds the database password.
 *
 * It is live: the open conversation checks for new messages and typing every
 * couple of seconds, and the inbox every few, so nothing needs a page refresh.
 */

/** The signed-in editor's Sanity token, which the hosted function checks. Set by the tool. */
let sanityToken: string | undefined;

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (sanityToken) headers.set('Authorization', `Bearer ${sanityToken}`);
  const res = await fetch('/support-api', { method: 'POST', headers, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Support answered ${res.status}`);
  return data;
}

type Status = 'open' | 'answered' | 'closed';
type Filter = 'awaiting' | Status | 'all';

interface ThreadRow {
  id: string;
  user_email: string | null;
  subject: string;
  category: string | null;
  status: Status;
  platform: string | null;
  last_sender: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  unread: boolean;
  last_body: string | null;
  message_count: number;
}

interface Message {
  id: string;
  sender: 'user' | 'admin';
  admin_name: string | null;
  body: string;
  created_at: string;
  /** A reply shown at once, before the server has confirmed it. */
  pending?: boolean;
}

interface ThreadDetail {
  thread: Omit<ThreadRow, 'unread' | 'last_body' | 'message_count' | 'last_sender'> & { user_id: string };
  messages: Message[];
}

type Counts = Record<Filter, number>;

const FILTERS: { id: Filter; title: string }[] = [
  { id: 'awaiting', title: 'Awaiting reply' },
  { id: 'open', title: 'Open' },
  { id: 'answered', title: 'Answered' },
  { id: 'closed', title: 'Closed' },
  { id: 'all', title: 'All' },
];

const STATUS_TONE: Record<Status, 'caution' | 'positive' | 'default'> = {
  open: 'caution',
  answered: 'positive',
  closed: 'default',
};

/** How often the open conversation checks for new messages and typing. */
const LIVE_MS = 2_000;
/** How often the inbox refreshes itself. */
const LIST_MS = 5_000;
/** A keystroke counts as "typing" for this long. */
const TYPING_MS = 4_000;
/** Typing is told to the person at most this often. */
const TYPING_SIGNAL_MS = 2_000;

/** The bubble and typing-dot animations (Sanity UI has none of its own). */
const LIVE_CSS = `
@keyframes support-bubble-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes support-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
.support-new { animation: support-bubble-in .28s cubic-bezier(.22,1,.36,1) both; }
.support-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: support-dot 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .support-new, .support-dot { animation: none; } }
`;

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

/** Adds messages not already shown, oldest first, with ones still sending last. */
/** The later of `cursor` and the newest of `messages`, as the server wrote it. */
function newestTime(cursor: string | null, messages: { created_at: string }[]): string | null {
  let newest = cursor;
  for (const { created_at } of messages) {
    if (!newest || Date.parse(created_at) > Date.parse(newest)) newest = created_at;
  }
  return newest;
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const known = new Set(current.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  if (!fresh.length) return current;
  return [...current, ...fresh].sort(
    (a, b) => Number(Boolean(a.pending)) - Number(Boolean(b.pending)) || Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

function SupportTool() {
  const client = useClient({ apiVersion: '2024-01-01' });
  sanityToken = client.config().token;
  const user = useCurrentUser();
  const toast = useToast();

  const [filter, setFilter] = React.useState<Filter>('awaiting');
  const [search, setSearch] = React.useState('');
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [threads, setThreads] = React.useState<ThreadRow[] | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [userTyping, setUserTyping] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  // Kept in refs so the live check always sees the latest without restarting.
  const selectedRef = React.useRef<string | null>(null);
  selectedRef.current = selected;
  const detailRef = React.useRef<ThreadDetail | null>(null);
  detailRef.current = detail;
  const draftRef = React.useRef('');
  draftRef.current = draft;
  const lastKeyRef = React.useRef(0);
  const lastSignalRef = React.useRef(0);
  const syncingRef = React.useRef(false);
  /** Messages there when a conversation opened don't animate; new ones do. */
  const firstIdsRef = React.useRef<Set<string>>(new Set());
  const tempRef = React.useRef(0);
  const endRef = React.useRef<HTMLDivElement>(null);
  /**
   * The newest message time the server has sent for the open conversation.
   * Our own reply is left out: using it would skip a message the person sent
   * in the moment before it.
   */
  const cursorRef = React.useRef<string | null>(null);
  /** Unsent words per conversation, so nothing typed for one person reaches another. */
  const draftsRef = React.useRef(new Map<string, string>());
  const scrolledRef = React.useRef(false);

  const loadList = React.useCallback(async () => {
    try {
      const [list, totals] = await Promise.all([
        call<{ threads: ThreadRow[] }>({ action: 'list', filter, search }),
        call<Counts>({ action: 'counts' }),
      ]);
      // The conversation on screen is being read, so it isn't new.
      setThreads(list.threads.map((t) => (t.id === selectedRef.current ? { ...t, unread: false } : t)));
      setCounts(totals);
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Could not load conversations.');
    }
  }, [filter, search]);

  // Reload when the filter or search changes (search waits for typing to pause).
  React.useEffect(() => {
    const id = window.setTimeout(() => void loadList(), search ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [loadList, search]);

  // The inbox stays current on its own: new concerns and replies appear without a refresh.
  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void loadList();
    };
    const id = window.setInterval(tick, LIST_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadList]);

  const openThread = React.useCallback(
    async (id: string) => {
      if (id === selectedRef.current && detailRef.current) return;
      const leaving = selectedRef.current;
      if (leaving) draftsRef.current.set(leaving, draftRef.current);
      setSelected(id);
      selectedRef.current = id;
      cursorRef.current = null;
      setDetail(null);
      setUserTyping(false);
      setDraft(draftsRef.current.get(id) ?? '');
      scrolledRef.current = false;
      setLoadingDetail(true);
      try {
        const data = await call<ThreadDetail>({ action: 'get', id });
        if (selectedRef.current !== id) return;
        firstIdsRef.current = new Set(data.messages.map((m) => m.id));
        cursorRef.current = newestTime(null, data.messages);
        setDetail(data);
        setThreads((current) => current?.map((t) => (t.id === id ? { ...t, unread: false } : t)) ?? null);
      } catch (error) {
        toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not open it.' });
      } finally {
        // An older request finishing late must not clear the newer one's loading state.
        if (selectedRef.current === id) setLoadingDetail(false);
      }
    },
    [toast],
  );

  /** The live check for the open conversation. */
  const sync = React.useCallback(async () => {
    const id = selectedRef.current;
    const current = detailRef.current;
    if (!id || !current || current.thread.id !== id || syncingRef.current) return;
    syncingRef.current = true;
    const typing = Boolean(draftRef.current.trim()) && Date.now() - lastKeyRef.current < TYPING_MS;
    if (typing) lastSignalRef.current = Date.now();
    try {
      const data = await call<{ status: Status; typing: boolean; messages: Message[] }>({
        action: 'sync',
        id,
        after: cursorRef.current,
        typing,
      });
      if (selectedRef.current !== id) return;
      cursorRef.current = newestTime(cursorRef.current, data.messages);
      setUserTyping(data.typing);
      setDetail((d) =>
        d && d.thread.id === id
          ? {
              thread: d.thread.status === data.status ? d.thread : { ...d.thread, status: data.status },
              messages: mergeMessages(d.messages, data.messages),
            }
          : d,
      );
    } catch {
      // A missed check is fine: the next one catches up.
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const liveId = detail?.thread.id ?? null;
  React.useEffect(() => {
    if (!liveId) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const id = window.setInterval(tick, LIVE_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [liveId, sync]);

  // Keep the newest message (or the typing dots) in view, gliding to it once open.
  const messageCount = detail?.messages.length ?? 0;
  React.useEffect(() => {
    if (!messageCount) return;
    endRef.current?.scrollIntoView({ block: 'end', behavior: scrolledRef.current ? 'smooth' : 'auto' });
    scrolledRef.current = true;
  }, [messageCount, userTyping, liveId]);

  const onDraft = (value: string) => {
    setDraft(value);
    draftRef.current = value;
    lastKeyRef.current = Date.now();
    // Tell the person straight away when typing starts, not at the next check.
    if (value.trim() && Date.now() - lastSignalRef.current > TYPING_SIGNAL_MS) void sync();
  };

  const sendReply = async () => {
    const id = selected;
    const body = draft.trim();
    if (!id || !body) return;
    const adminName = user?.name ?? 'Serenity team';
    // Show it at once, as messaging apps do; it settles when the server has it.
    const tempId = `sending-${++tempRef.current}`;
    const stand: Message = {
      id: tempId,
      sender: 'admin',
      admin_name: adminName,
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setDetail((d) => (d && d.thread.id === id ? { ...d, messages: [...d.messages, stand] } : d));
    setDraft('');
    draftsRef.current.delete(id);
    lastKeyRef.current = 0;
    try {
      const { message, status } = await call<{ message: Message; status?: Status }>({
        action: 'reply',
        id,
        body,
        adminName,
      });
      setDetail((d) =>
        d && d.thread.id === id
          ? {
              // Still "open" when a message from them crossed with this reply.
              thread: { ...d.thread, status: status ?? 'answered' },
              messages: mergeMessages(d.messages.filter((m) => m.id !== tempId), [message]),
            }
          : d,
      );
      void loadList();
    } catch (error) {
      setDetail((d) => (d ? { ...d, messages: d.messages.filter((m) => m.id !== tempId) } : d));
      // Back into the draft of the conversation it was written for, wherever the screen is now.
      if (selectedRef.current === id) setDraft((current) => current || body);
      else draftsRef.current.set(id, draftsRef.current.get(id) || body);
      toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not send the reply.' });
    }
  };

  const setStatus = async (status: Status) => {
    const id = selected;
    if (!id) return;
    try {
      await call({ action: 'status', id, status });
      toast.push({ status: 'success', title: status === 'closed' ? 'Closed' : `Marked ${status}` });
      // Only the conversation it was set on, even if another is open by now.
      setDetail((d) => (d && d.thread.id === id ? { ...d, thread: { ...d.thread, status } } : d));
      void loadList();
    } catch (error) {
      toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not change it.' });
    }
  };

  return (
    <Flex height="fill" style={{ minHeight: 0 }}>
      <style>{LIVE_CSS}</style>
      {/* The inbox. */}
      <Card borderRight style={{ width: 400, minWidth: 320, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box padding={4} paddingBottom={3}>
          <Flex align="center" justify="space-between">
            <Heading size={1}>Support</Heading>
            <Button icon={RefreshIcon} mode="bleed" title="Refresh" onClick={() => void loadList()} />
          </Flex>
          <Flex gap={1} marginTop={3} wrap="wrap">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                fontSize={1}
                padding={2}
                mode={filter === item.id ? 'default' : 'ghost'}
                tone={filter === item.id ? 'primary' : 'default'}
                text={counts ? `${item.title} ${counts[item.id]}` : item.title}
                onClick={() => setFilter(item.id)}
              />
            ))}
          </Flex>
          <Box marginTop={3}>
            <TextInput
              icon={SearchIcon}
              placeholder="Search subject or email"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </Box>
        </Box>
        <Box flex={1} style={{ overflowY: 'auto' }}>
          {problem ? (
            <Card margin={3} padding={3} radius={2} tone="critical">
              <Text size={1}>{problem}</Text>
            </Card>
          ) : threads === null ? (
            <Flex justify="center" padding={5}>
              <Spinner muted />
            </Flex>
          ) : threads.length === 0 ? (
            <Box padding={4}>
              <Text muted size={1}>
                {filter === 'awaiting' ? 'Nothing is waiting for a reply.' : 'No conversations here.'}
              </Text>
            </Box>
          ) : (
            <Stack>
              {threads.map((thread) => (
                <Card
                  key={thread.id}
                  as="button"
                  padding={3}
                  borderTop
                  tone={selected === thread.id ? 'primary' : 'default'}
                  onClick={() => void openThread(thread.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', border: 0, width: '100%' }}
                >
                  <Stack gap={2}>
                    <Flex align="center" gap={2}>
                      {thread.unread ? (
                        <span aria-label="New" style={{ width: 8, height: 8, borderRadius: 8, background: '#2f7bf6', flexShrink: 0 }} />
                      ) : null}
                      <Box flex={1} style={{ minWidth: 0 }}>
                        <Text size={1} weight={thread.unread ? 'semibold' : 'medium'} textOverflow="ellipsis">
                          {thread.subject}
                        </Text>
                      </Box>
                      <Text size={0} muted>
                        {when(thread.updated_at)}
                      </Text>
                    </Flex>
                    <Text size={1} muted textOverflow="ellipsis">
                      {thread.user_email ?? 'Unknown'}
                    </Text>
                    <Text size={1} muted textOverflow="ellipsis">
                      {selected === thread.id && userTyping
                        ? 'Typing…'
                        : `${thread.last_sender === 'admin' ? 'You: ' : ''}${thread.last_body ?? ''}`}
                    </Text>
                    <Flex gap={2}>
                      <Badge tone={STATUS_TONE[thread.status]} fontSize={0}>
                        {thread.status}
                      </Badge>
                      {thread.category ? <Badge fontSize={0}>{thread.category}</Badge> : null}
                    </Flex>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Card>

      {/* The conversation. */}
      <Box flex={1} style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!selected ? (
          <Flex align="center" justify="center" height="fill" direction="column" gap={3} padding={5}>
            <Text size={4} muted>
              <CommentIcon />
            </Text>
            <Text muted>Choose a conversation to read and reply.</Text>
          </Flex>
        ) : loadingDetail && !detail ? (
          <Flex justify="center" padding={6}>
            <Spinner muted />
          </Flex>
        ) : detail ? (
          <>
            <Card padding={4} borderBottom>
              <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
                <Stack gap={3} style={{ minWidth: 0, flex: 1 }}>
                  <Heading size={1}>{detail.thread.subject}</Heading>
                  <Text size={1} muted>
                    {detail.thread.user_email ?? 'Unknown'}
                    {detail.thread.category ? ` · ${detail.thread.category}` : ''}
                    {detail.thread.platform ? ` · ${detail.thread.platform}` : ''}
                    {` · opened ${when(detail.thread.created_at)}`}
                  </Text>
                </Stack>
                <Flex gap={2} align="center">
                  <Badge tone={STATUS_TONE[detail.thread.status]}>{detail.thread.status}</Badge>
                  {detail.thread.status === 'closed' ? (
                    <Button text="Reopen" mode="ghost" onClick={() => void setStatus('open')} />
                  ) : (
                    <Button text="Close" mode="ghost" onClick={() => void setStatus('closed')} />
                  )}
                </Flex>
              </Flex>
            </Card>

            <Box flex={1} padding={4} style={{ overflowY: 'auto' }}>
              <Stack gap={3}>
                {detail.messages.map((message) => {
                  const mine = message.sender === 'admin';
                  return (
                    <Flex
                      key={message.id}
                      justify={mine ? 'flex-end' : 'flex-start'}
                      className={firstIdsRef.current.has(message.id) ? undefined : 'support-new'}
                    >
                      <Card
                        padding={3}
                        radius={3}
                        tone={mine ? 'primary' : 'transparent'}
                        border={!mine}
                        style={{ maxWidth: '75%', opacity: message.pending ? 0.7 : 1, transition: 'opacity .2s' }}
                      >
                        <Stack gap={2}>
                          <Text size={0} muted>
                            {mine ? message.admin_name ?? 'Serenity team' : detail.thread.user_email ?? 'User'} ·{' '}
                            {message.pending ? 'Sending…' : new Date(message.created_at).toLocaleString()}
                          </Text>
                          <Text size={1} style={{ whiteSpace: 'pre-wrap' }}>
                            {message.body}
                          </Text>
                        </Stack>
                      </Card>
                    </Flex>
                  );
                })}
                {userTyping ? (
                  <Flex justify="flex-start" className="support-new">
                    <Card padding={3} radius={3} border tone="transparent">
                      <span aria-label={`${detail.thread.user_email ?? 'The person'} is typing`} style={{ display: 'flex', gap: 4, alignItems: 'center', height: 14, opacity: 0.6 }}>
                        <span className="support-dot" />
                        <span className="support-dot" style={{ animationDelay: '160ms' }} />
                        <span className="support-dot" style={{ animationDelay: '320ms' }} />
                      </span>
                    </Card>
                  </Flex>
                ) : null}
                <div ref={endRef} />
              </Stack>
            </Box>

            <Card padding={4} borderTop>
              <Stack gap={3}>
                <TextArea
                  rows={3}
                  placeholder="Write a reply. The person sees it in the app under Help & support."
                  value={draft}
                  onChange={(event) => onDraft(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void sendReply();
                    }
                  }}
                />
                <Flex justify="space-between" align="center">
                  <Text size={0} muted>
                    Enter to send, Shift+Enter for a new line. Sending marks it answered.
                  </Text>
                  <Button text="Send reply" tone="primary" disabled={!draft.trim()} onClick={() => void sendReply()} />
                </Flex>
              </Stack>
            </Card>
          </>
        ) : null}
      </Box>
    </Flex>
  );
}

export const supportTool: Tool = {
  name: 'support',
  title: 'Support',
  icon: CommentIcon,
  component: SupportTool,
};
