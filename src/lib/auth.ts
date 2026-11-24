import { AUTH_STORAGE_KEY, storedAccount, TEST_ACCOUNT, TEST_SESSION_KEY } from '@/lib/account-scope';
import { getSupabase } from '@/lib/supabase/client';
import { rememberGuestLikes } from '@/lib/video-likes';

/**
 * Email sign-in with a one-time code, on the app's Supabase project.
 *
 * There are no passwords: both signing in and creating an account send a code
 * to the email, and typing it back is what proves the address. Signing in
 * refuses to create an account, so a mistyped email says "no account" rather
 * than quietly making a second one.
 *
 * The code itself comes from the project's email template, which has to include
 * `{{ .Token }}` (Supabase's default template sends a link instead).
 */

export type AuthErrorCode =
  | 'unavailable'
  | 'offline'
  | 'invalid_email'
  | 'no_account'
  | 'invalid_code'
  | 'rate_limited'
  | 'email_failed'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

/** Words for each failure, as the sheets show them. */
export function authErrorText(error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'unknown';
  switch (code) {
    case 'unavailable':
      return 'Sign-in isn’t available right now. You can skip it and come back later.';
    case 'offline':
      return 'You seem to be offline. Check your connection and try again.';
    case 'invalid_email':
      return 'That doesn’t look like an email address.';
    case 'no_account':
      return 'There’s no account with that email yet.';
    case 'invalid_code':
      // Each new code replaces the last, so an older email's code no longer works.
      return 'That code didn’t work. Use the code from the newest email, or send a new one.';
    case 'rate_limited':
      return 'Too many codes asked for. Wait a minute, then try again.';
    case 'email_failed':
      return 'We couldn’t send the email just now. Please try again in a few minutes.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** Exported for its tests. */
export function authErrorFrom(error: { message?: string; code?: string; status?: number }): AuthError {
  return toError(error);
}

function toError(error: { message?: string; code?: string; status?: number }): AuthError {
  const message = error.message ?? '';
  if (/signups? not allowed|otp_disabled|user not found/i.test(`${message} ${error.code ?? ''}`)) {
    return new AuthError('no_account', message);
  }
  // Before the code check below: an address the server rejects also says
  // "invalid", and was reported as a wrong code.
  if (error.code === 'email_address_invalid' || /email.*invalid|invalid.*email|validate email/i.test(message)) {
    return new AuthError('invalid_email', message);
  }
  // Safari words a dropped connection "Load failed".
  if (/fetch|network|load failed/i.test(message)) return new AuthError('offline', message);
  if (error.code === 'otp_expired' || /token has expired|invalid/i.test(message)) {
    return new AuthError('invalid_code', message);
  }
  // Supabase's built-in mailer only sends to the project team's own
  // addresses; any other inbox is refused until custom SMTP is set up.
  if (error.code === 'email_address_not_authorized' || /not authorized/i.test(message)) {
    return new AuthError('email_failed', message);
  }
  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    /rate limit|security purposes/i.test(message)
  ) {
    return new AuthError('rate_limited', message);
  }
  // The account service could not hand the email to the mail provider (see
  // the SMTP settings in Supabase): nothing the reader can fix by retyping.
  if (/error sending .*email/i.test(message)) return new AuthError('email_failed', message);
  return new AuthError('unknown', message);
}

/*
 * A test account for local development, so the sign-in flow can be walked
 * through without a real inbox. It never touches Supabase, and it exists only
 * in `npm run dev`: production and mobile builds compile it away.
 */
export { TEST_ACCOUNT };

function isTestAccount(email: string): boolean {
  return TEST_ACCOUNT !== null && normaliseEmail(email) === TEST_ACCOUNT.email;
}

/*
 * Whether the test account is signed in. Kept in sessionStorage so a reload in
 * `npm run dev` stays signed in, the way a real Supabase session does.
 */
function readTestSession(): boolean {
  try {
    return TEST_ACCOUNT !== null && window.sessionStorage.getItem(TEST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

let testSignedIn = typeof window !== 'undefined' && readTestSession();

function setTestSignedIn(value: boolean): void {
  testSignedIn = value;
  try {
    if (value) window.sessionStorage.setItem(TEST_SESSION_KEY, '1');
    else window.sessionStorage.removeItem(TEST_SESSION_KEY);
  } catch {
    // A blocked store only means a reload signs the test account out.
  }
  notifyAuthChange();
}

/**
 * Fired on this window whenever the signed-in account may have changed in a
 * way Supabase does not announce itself (the test account).
 */
export const AUTH_CHANGE_EVENT = 'serenity:auth-change';

function notifyAuthChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/** Whether accounts exist in this build at all: Supabase keys, or the dev test account. */
export function accountsAvailable(): boolean {
  return getSupabase() !== null || TEST_ACCOUNT !== null;
}

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new AuthError('unavailable');
  return supabase;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Sends a sign-in code. Fails with `no_account` when nobody uses the email. */
export async function sendSignInCode(email: string): Promise<void> {
  if (isTestAccount(email)) return;
  const { error } = await client().auth.signInWithOtp({
    email: normaliseEmail(email),
    options: { shouldCreateUser: false },
  });
  if (error) throw toError(error);
}

/** Sends a code that, once typed back, creates the account. */
export async function sendSignUpCode(email: string, firstName: string, lastName: string): Promise<void> {
  if (isTestAccount(email)) return;
  const { error } = await client().auth.signInWithOtp({
    email: normaliseEmail(email),
    options: {
      shouldCreateUser: true,
      data: { first_name: firstName.trim(), last_name: lastName.trim() },
    },
  });
  if (error) throw toError(error);
}

/** Checks the code from the email; on success the device is signed in. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (TEST_ACCOUNT && isTestAccount(email)) {
    if (code.trim() !== TEST_ACCOUNT.code) throw new AuthError('invalid_code');
    setTestSignedIn(true);
    return;
  }
  // A guest's likes are kept for the account this signs in to (lib/video-likes).
  await rememberGuestLikes().catch(() => undefined);
  const { error } = await client().auth.verifyOtp({
    email: normaliseEmail(email),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw toError(error);
}

/**
 * The email of the account signed in on this device, or null. An anonymous
 * account (as video likes create) has no email and counts as signed out here.
 */
export async function accountEmail(): Promise<string | null> {
  // Read from the phone: asking Supabase tries to refresh an expired token,
  // and with no signal that reads as signed out.
  return storedAccount()?.email ?? null;
}

/** How long sign-out waits for the server before finishing on the phone alone. */
const SIGN_OUT_WAIT_MS = 3000;

/**
 * Signs this device out, and only this one. It works with no signal: on a
 * shared phone, signing out is what hides this reader's data, so it cannot
 * depend on the network. The data stays, under their account (lib/account-scope).
 */
export async function signOut(): Promise<void> {
  if (TEST_ACCOUNT && testSignedIn) {
    setTestSignedIn(false);
    return;
  }
  const revoked = client()
    .auth.signOut({ scope: 'local' })
    .catch(() => undefined);
  await Promise.race([revoked, new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS))]);
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Blocked storage never held a session to remove.
  }
  notifyAuthChange();
}


