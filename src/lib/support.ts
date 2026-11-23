import { getSupabase } from '@/lib/supabase/client';

/**
 * Help & support: concerns raised from the app, answered by the Serenity team.
 *
 * The conversations live in a Neon database behind the Sanity Studio's Vercel
 * project (studio/api/support.ts), not in Supabase. Each request carries the
 * person's Supabase sign-in, which that function checks, so people only ever
 * see their own conversations. The team replies from the Studio's Support tab.
 */

const ENDPOINT =
  process.env.NEXT_PUBLIC_SUPPORT_API || 'https://serenity-studio-cms.vercel.app/api/support';

export const SUPPORT_CATEGORIES = [
  'Something isn’t working',
  'Account & sign-in',
  'Sessions & content',
  'Suggestion',
  'Other',
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export type SupportStatus = 'open' | 'answered' | 'closed';

export interface SupportThread {
  id: string;
  subject: string;
  category: string | null;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
  unread: boolean;
  last_body: string | null;
  last_sender: 'user' | 'admin' | null;
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'admin';
  admin_name: string | null;
  body: string;
  created_at: string;
}

export class SupportError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SupportError';
  }
}

/** Where the app is running, so the team knows which version to look at. */
function platform(): string {
  if (typeof window === 'undefined') return 'web';
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const native = capacitor?.getPlatform?.();
  if (native && native !== 'web') return `${native} app`;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return standalone ? 'home screen app' : 'web';
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) throw new SupportError('Support isn’t available in this version of the app.', 503);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new SupportError('Sign in with your email to contact support.', 401);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new SupportError('You seem to be offline. Check your connection and try again.', 0);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new SupportError(body.error ?? 'Something went wrong. Please try again.', res.status);
  return body;
}

export function listThreads() {
  return call<{ threads: SupportThread[]; unread: number }>({ action: 'list' });
}

export function getThread(id: string) {
  return call<{ thread: Omit<SupportThread, 'unread' | 'last_body' | 'last_sender'>; messages: SupportMessage[] }>({
    action: 'get',
    id,
  });
}

export function createThread(input: { subject: string; body: string; category: SupportCategory }) {
  return call<{ id: string }>({ action: 'create', ...input, platform: platform() });
}

/**
 * The open conversation's live check: messages since `after` (the newest one
 * already shown; it may come back again), whether the team is typing, and
 * whether this person is.
 */
export function syncThread(id: string, after: string | null, typing: boolean) {
  return call<{ status: SupportStatus; typing: boolean; messages: SupportMessage[] }>({
    action: 'sync',
    id,
    after,
    typing,
  });
}

export function replyToThread(id: string, body: string) {
  return call<{ id: string; message: SupportMessage }>({ action: 'reply', id, body });
}

export function closeThread(id: string) {
  return call<{ id: string }>({ action: 'close', id });
}

export function supportErrorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/** The later of `cursor` and the newest of `messages`, as the server wrote it. */
export function newestTime(cursor: string | null, messages: { created_at: string }[]): string | null {
  let newest = cursor;
  for (const { created_at } of messages) {
    if (!newest || Date.parse(created_at) > Date.parse(newest)) newest = created_at;
  }
  return newest;
}
