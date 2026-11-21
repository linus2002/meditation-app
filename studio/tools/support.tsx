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

/** How often the list refreshes itself while the tab is open. */
const REFRESH_MS = 60_000;

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
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
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const loadList = React.useCallback(async () => {
    try {
      const [list, totals] = await Promise.all([
        call<{ threads: ThreadRow[] }>({ action: 'list', filter, search }),
        call<Counts>({ action: 'counts' }),
      ]);
      setThreads(list.threads);
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

  React.useEffect(() => {
    const id = window.setInterval(() => void loadList(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadList]);

  const openThread = React.useCallback(async (id: string) => {
    setSelected(id);
    setLoadingDetail(true);
    try {
      setDetail(await call<ThreadDetail>({ action: 'get', id }));
      // Opening marks it read in the list.
      setThreads((current) => current?.map((t) => (t.id === id ? { ...t, unread: false } : t)) ?? null);
    } catch (error) {
      toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not open it.' });
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  const sendReply = async () => {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await call({ action: 'reply', id: selected, body: draft, adminName: user?.name ?? 'Serenity team' });
      setDraft('');
      toast.push({ status: 'success', title: 'Reply sent' });
      await Promise.all([openThread(selected), loadList()]);
    } catch (error) {
      toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not send the reply.' });
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: Status) => {
    if (!selected) return;
    try {
      await call({ action: 'status', id: selected, status });
      toast.push({ status: 'success', title: status === 'closed' ? 'Closed' : `Marked ${status}` });
      await Promise.all([openThread(selected), loadList()]);
    } catch (error) {
      toast.push({ status: 'error', title: error instanceof Error ? error.message : 'Could not change it.' });
    }
  };

  return (
    <Flex height="fill" style={{ minHeight: 0 }}>
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
                      {thread.last_sender === 'admin' ? 'You: ' : ''}
                      {thread.last_body ?? ''}
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
                    <Flex key={message.id} justify={mine ? 'flex-end' : 'flex-start'}>
                      <Card
                        padding={3}
                        radius={3}
                        tone={mine ? 'primary' : 'transparent'}
                        border={!mine}
                        style={{ maxWidth: '75%' }}
                      >
                        <Stack gap={2}>
                          <Text size={0} muted>
                            {mine ? message.admin_name ?? 'Serenity team' : detail.thread.user_email ?? 'User'} ·{' '}
                            {new Date(message.created_at).toLocaleString()}
                          </Text>
                          <Text size={1} style={{ whiteSpace: 'pre-wrap' }}>
                            {message.body}
                          </Text>
                        </Stack>
                      </Card>
                    </Flex>
                  );
                })}
              </Stack>
            </Box>

            <Card padding={4} borderTop>
              <Stack gap={3}>
                <TextArea
                  rows={4}
                  placeholder="Write a reply. The person sees it in the app under Help & support."
                  value={draft}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void sendReply();
                  }}
                />
                <Flex justify="space-between" align="center">
                  <Text size={0} muted>
                    Ctrl+Enter to send. Sending marks it answered.
                  </Text>
                  <Button
                    text="Send reply"
                    tone="primary"
                    disabled={!draft.trim() || sending}
                    loading={sending}
                    onClick={() => void sendReply()}
                  />
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
