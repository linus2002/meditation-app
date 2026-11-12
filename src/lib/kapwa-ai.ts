import { kapwaMessages } from '../../supabase/functions/_shared/kapwa-prompt';

import { getSupabase } from '@/lib/supabase/client';

/**
 * Kapwa's AI replies. NEXT_PUBLIC_KAPWA_AI picks where they come from:
 *
 * - `local`: straight from Ollama on this computer (or, for a phone on the
 *   same Wi-Fi, on the computer serving the page). No key, no cloud. For
 *   development and demos only: real users can't reach your computer.
 * - `1`: the `kapwa-chat` Supabase edge function, which holds the Ollama Cloud
 *   key, adds the prompt, enforces a quota and streams the reply back.
 * - empty: off.
 *
 * Off, offline, over quota or on any error, the chat falls back to the keyword
 * replies in `lib/kapwa`, so Kapwa always answers. The safety checks in
 * `lib/kapwa` run before this is called.
 */

const mode = process.env.NEXT_PUBLIC_KAPWA_AI;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const localMode = mode === 'local';
const cloudMode = mode === '1' && !!url && !!anonKey;
export const kapwaAiEnabled = localMode || cloudMode;

/** Local mode: which model, and where Ollama listens (default: the page's host). */
const LOCAL_MODEL = process.env.NEXT_PUBLIC_KAPWA_LOCAL_MODEL || 'qwen2.5:3b';
/** CPU threads for the local model. Fewer than all cores keeps the computer
 *  responsive while Kapwa writes, and on laptops with efficiency cores it is
 *  often faster too. Empty lets Ollama decide. */
const LOCAL_THREADS = Number(process.env.NEXT_PUBLIC_KAPWA_LOCAL_THREADS) || undefined;
/** Prompt, app context, recent chat and the reply fit well inside this. */
const LOCAL_CTX = 4096;
const LOCAL_URL = process.env.NEXT_PUBLIC_KAPWA_LOCAL_URL;

/** How many recent messages are sent along for context. */
export const HISTORY_TURNS = 12;
/** Give up and fall back if the first words take longer than this. A local
 *  model on a CPU, loading into memory for the first time, can take minutes. */
const FIRST_TOKEN_MS = localMode ? 180_000 : 20_000;
/** Local mode: how long Ollama keeps the model in memory after a reply. */
const KEEP_ALIVE = '10m';

const localBase = () => LOCAL_URL || `http://${window.location.hostname}:11434`;

function localMessages(history: KapwaTurn[], context: string) {
  return kapwaMessages(context, history);
}

/**
 * Local mode: loads the model and reads Kapwa's prompt and app context ahead
 * of the first message, so the first reply isn't the slow one. Fire and forget.
 */
export function warmUpKapwaAi(context: string): void {
  if (!localMode) return;
  void fetch(`${localBase()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      stream: false,
      keep_alive: KEEP_ALIVE,
      messages: localMessages([{ role: 'user', content: 'Hi' }], context),
      options: { num_predict: 1, num_ctx: LOCAL_CTX, num_thread: LOCAL_THREADS },
    }),
  }).catch(() => {
    // Not running yet; the first message will simply fall back.
  });
}

export interface KapwaTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The recent conversation in the shape the model expects: the welcome is
 * dropped, empty messages skipped, and it ends with the reader's message.
 */
export function buildHistory(
  messages: { id: string; from: 'kapwa' | 'you'; text: string }[],
  latest: string,
): KapwaTurn[] {
  const turns: KapwaTurn[] = messages
    .filter((message) => message.id !== 'welcome' && message.text.trim())
    .map((message) => ({
      role: message.from === 'you' ? ('user' as const) : ('assistant' as const),
      content: message.text,
    }));
  turns.push({ role: 'user', content: latest });
  return turns.slice(-HISTORY_TURNS);
}

/** The text in one line of Ollama's streamed output (one JSON object per line). */
export function ollamaLineText(line: string): string {
  if (!line.trim()) return '';
  try {
    const chunk = JSON.parse(line) as { message?: { content?: string } };
    return chunk.message?.content ?? '';
  } catch {
    return '';
  }
}

async function localRequest(history: KapwaTurn[], context: string, signal: AbortSignal) {
  return fetch(`${localBase()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      stream: true,
      keep_alive: KEEP_ALIVE,
      messages: localMessages(history, context),
      options: { temperature: 0.5, num_predict: 350, num_ctx: LOCAL_CTX, num_thread: LOCAL_THREADS },
    }),
    signal,
  });
}

async function cloudRequest(history: KapwaTurn[], context: string, signal: AbortSignal) {
  const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  return fetch(`${url}/functions/v1/kapwa-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey!,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages: history, context }),
    signal,
  });
}

/**
 * Streams Kapwa's reply, calling `onText` with the text so far. Resolves with
 * the full reply, or throws, in which case the caller falls back.
 */
export async function streamKapwaReply(
  history: KapwaTurn[],
  context: string,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!kapwaAiEnabled) throw new Error('disabled');

  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), FIRST_TOKEN_MS);
  signal?.addEventListener('abort', () => timeout.abort());

  try {
    const response = localMode
      ? await localRequest(history, context, timeout.signal)
      : await cloudRequest(history, context, timeout.signal);
    if (!response.ok || !response.body) throw new Error(`kapwa ai ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      window.clearTimeout(timer);
      const chunk = decoder.decode(value, { stream: true });
      if (localMode) {
        // Raw Ollama output: JSON lines. The cloud proxy sends plain text.
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        text += lines.map(ollamaLineText).join('');
      } else {
        text += chunk;
      }
      onText(text);
    }
    if (localMode) text += ollamaLineText(buffer);
    text = text.trim();
    if (!text) throw new Error('empty reply');
    return text;
  } finally {
    window.clearTimeout(timer);
  }
}
