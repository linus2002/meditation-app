/**
 * kapwa-chat: the only place Kapwa's AI key lives.
 *
 * The app (web and phone) posts the recent conversation here; this function
 * adds Kapwa's system prompt, checks the sender's hourly quota and forwards
 * the chat to Ollama Cloud, streaming the reply back as plain text.
 *
 * The app keeps its own safety layer: anything about self-harm or medical
 * warning signs is answered on the device with fixed replies and never sent
 * here. The prompt below is a second line of defence, not the first.
 *
 * Secrets (supabase secrets set ...):
 *   OLLAMA_API_KEY      required, from ollama.com -> Settings -> Keys
 *   KAPWA_MODEL         optional, default gpt-oss:20b
 *   KAPWA_HOURLY_LIMIT  optional, messages per person per hour, default 30
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { kapwaMessages } from '../_shared/kapwa-prompt.ts';

const OLLAMA_URL = 'https://ollama.com/api/chat';
const MODEL = Deno.env.get('KAPWA_MODEL') ?? 'gpt-oss:20b';
const HOURLY_LIMIT = Number(Deno.env.get('KAPWA_HOURLY_LIMIT') ?? '30');
const MAX_TURNS = 12;
const MAX_CHARS = 600;
const MAX_CONTEXT_CHARS = 16_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Turn = { role: 'user' | 'assistant'; content: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function cleanTurns(input: unknown): Turn[] | null {
  if (!Array.isArray(input)) return null;
  const turns = input
    .filter(
      (t): t is Turn =>
        !!t &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.content === 'string' &&
        t.content.trim().length > 0,
    )
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_CHARS) }));
  return turns.length > 0 && turns[turns.length - 1].role === 'user' ? turns : null;
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const apiKey = Deno.env.get('OLLAMA_API_KEY');
  if (!apiKey) return json(503, { error: 'not_configured' });

  let body: { messages?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_request' });
  }
  const turns = cleanTurns(body.messages);
  if (!turns) return json(400, { error: 'bad_request' });
  const appContext =
    typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : '';

  // Quota: per account when signed in, otherwise per (hashed) IP address.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  let subject: string | null = null;
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token && token.split('.').length === 3) {
    const { data } = await admin.auth.getUser(token);
    if (data.user) subject = `user:${data.user.id}`;
  }
  if (!subject) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    subject = `ip:${await sha256(ip)}`;
  }
  const { data: allowed, error: quotaError } = await admin.rpc('kapwa_take_quota', {
    p_subject: subject,
    p_limit: HOURLY_LIMIT,
  });
  if (quotaError) console.error('quota check failed', quotaError.message);
  else if (allowed === false) return json(429, { error: 'rate_limited' });

  const upstream = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: kapwaMessages(appContext, turns),
      options: { temperature: 0.5, num_predict: 450, num_ctx: 8192 },
    }),
  }).catch((error) => {
    console.error('ollama unreachable', error);
    return null;
  });

  if (!upstream || !upstream.ok || !upstream.body) {
    if (upstream) console.error('ollama error', upstream.status, await upstream.text());
    return json(502, { error: 'upstream_failed' });
  }

  // Ollama streams one JSON object per line; pass on just the text.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const emit = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.trim()) return;
    try {
      const chunk = JSON.parse(line);
      const text: string | undefined = chunk?.message?.content;
      if (text) controller.enqueue(encoder.encode(text));
    } catch {
      // A malformed line is skipped rather than ending the reply.
    }
  };
  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(bytes, controller) {
        buffer += decoder.decode(bytes, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) emit(line, controller);
      },
      flush(controller) {
        emit(buffer, controller);
      },
    }),
  );

  return new Response(stream, {
    headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
