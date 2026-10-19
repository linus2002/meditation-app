import { getSupabase } from '@/lib/supabase/client';

/**
 * Email sign-in with a one-time code, on the same Supabase project as Circles.
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
      return 'That code is wrong or has expired. Check the email, or send a new one.';
    case 'rate_limited':
      return 'Too many codes asked for. Wait a minute, then try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function toError(error: { message?: string; code?: string; status?: number }): AuthError {
  const message = error.message ?? '';
  if (/signups? not allowed|otp_disabled|user not found/i.test(`${message} ${error.code ?? ''}`)) {
    return new AuthError('no_account', message);
  }
  if (error.code === 'otp_expired' || /token has expired|invalid/i.test(message)) {
    return new AuthError('invalid_code', message);
  }
  if (error.status === 429 || /rate limit|security purposes/i.test(message)) {
    return new AuthError('rate_limited', message);
  }
  if (error.code === 'email_address_invalid' || /email.*invalid|invalid.*email/i.test(message)) {
    return new AuthError('invalid_email', message);
  }
  if (/fetch|network/i.test(message)) return new AuthError('offline', message);
  return new AuthError('unknown', message);
}

/*
 * A test account for local development, so the sign-in flow can be walked
 * through without a real inbox. It never touches Supabase, and it exists only
 * in `npm run dev`: production and mobile builds compile it away.
 */
export const TEST_ACCOUNT =
  process.env.NODE_ENV === 'development'
    ? { email: 'test@serenity.dev', code: '123456', firstName: 'Test' }
    : null;

function isTestAccount(email: string): boolean {
  return TEST_ACCOUNT !== null && normaliseEmail(email) === TEST_ACCOUNT.email;
}

/** Set once the test account has signed in on this page load. */
let testSignedIn = false;

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
    testSignedIn = true;
    return;
  }
  const { error } = await client().auth.verifyOtp({
    email: normaliseEmail(email),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw toError(error);
}

/**
 * The first name given at sign-up, for the home greeting. Read from the
 * account itself, so it follows the reader to a new phone.
 */
export async function accountFirstName(): Promise<string | null> {
  if (TEST_ACCOUNT && testSignedIn) return TEST_ACCOUNT.firstName;
  const { data } = await client().auth.getUser();
  const value = data.user?.user_metadata?.first_name;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
