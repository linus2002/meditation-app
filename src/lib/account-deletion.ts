import { personalAccountId, AUTH_STORAGE_KEY } from '@/lib/account-scope';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Deleting the signed-in account: on the server (Studio's /api/account, which
 * removes support conversations, analytics and the Supabase account with all
 * it synced), then everything this account kept on the phone.
 */

const ENDPOINT =
  process.env.NEXT_PUBLIC_ACCOUNT_API ||
  (process.env.NEXT_PUBLIC_SUPPORT_API || 'https://serenity-studio-cms.vercel.app/api/support').replace(
    /\/api\/support$/,
    '/api/account',
  );

export type AnalyticsOutcome = 'deleted' | 'none' | 'manual' | 'not-configured';

/**
 * The storage keys that belong to one account: its personal stores
 * (lib/account-scope) and its analytics identity and consent (lib/analytics).
 */
export function localKeysOf(keys: string[], userId: string): string[] {
  const tag = `user_${userId}`;
  const analytics = new RegExp(`serenity_(consent_)?${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9-])`, 'i');
  return keys.filter((key) => key.endsWith(`:user:${userId}`) || analytics.test(key));
}

function eraseLocal(userId: string): void {
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of localKeysOf(keys, userId)) window.localStorage.removeItem(key);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Storage is blocked: there is nothing kept to erase.
  }
}

export class AccountDeletionError extends Error {}

/** Deletes the account everywhere. Resolves with what became of the analytics data. */
export async function deleteAccount(): Promise<AnalyticsOutcome> {
  const userId = personalAccountId();
  const supabase = getSupabase();
  if (!userId || !supabase) throw new AccountDeletionError('Sign in to delete your account.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || data.session?.user.id !== userId) throw new AccountDeletionError('Sign in again to delete your account.');

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', confirm: 'DELETE' }),
    });
  } catch {
    throw new AccountDeletionError('You seem to be offline. Your account was not deleted; try again when connected.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; analytics?: AnalyticsOutcome };
  if (!res.ok) throw new AccountDeletionError(body.error ?? 'Your account could not be deleted just now. Please try again.');

  eraseLocal(userId);
  return body.analytics ?? 'not-configured';
}
