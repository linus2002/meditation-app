/**
 * Whose data this page is working with.
 *
 * Everything personal kept on the phone lives under a key that names its
 * owner: an account, or the guest. Signing out hides an account's data rather
 * than erasing it; signing back in brings it back.
 *
 * The owner is settled once per page load and never changes underneath it. A
 * change of account loads a fresh page (see lib/account-change), so a timer, a
 * cache or a request still running for the last reader can only ever write to
 * that reader's store.
 *
 * This keeps readers apart on a shared phone. It is not encryption: someone
 * with the unlocked phone and developer tools can still read storage.
 *
 * A new personal store must be read and written through `personalKey`, never
 * under a bare key.
 */

export const AUTH_STORAGE_KEY = 'serenity.auth.v1';
/** The dev-only test account's sign-in flag, in sessionStorage. */
export const TEST_SESSION_KEY = 'serenity.test-auth';
export const TEST_ACCOUNT =
  process.env.NODE_ENV === 'development'
    ? { email: 'test@serenity.dev', code: '123456', firstName: 'Test' }
    : null;

/** What belongs to the phone whoever is using it: the tour, and the theme. */
const DEVICE_KEY = 'serenity.device.v1';
const META_KEY = 'serenity.accounts.v1';
/** Written by builds from before this; names whose data the old keys held. */
const OLD_OWNER_KEY = 'serenity.sync-owner';
const STATE_KEY = 'serenity.state.v1';

/** The keys builds from before this kept personal data under. */
const PERSONAL_KEYS = [
  STATE_KEY,
  'serenity.kapwa.v1',
  'serenity.mixes.v1',
  'serenity.schedule.v1',
  'serenity.resume.v1',
  'serenity.support.v1',
  'serenity.inspiration.plan.v1',
  'serenity.inspiration.seen.v1',
  'serenity.likedVideos.v1',
  'serenity.likedVideos.pending.v1',
];

export type Scope = 'guest' | 'unclaimed' | `user:${string}`;

export interface Account {
  id: string;
  email: string;
  firstName?: string;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface AuthUser {
  id?: string;
  email?: string;
  is_anonymous?: boolean;
  user_metadata?: { first_name?: unknown };
}

/** An account with an email; an anonymous one (video likes) is a guest. */
export function scopeOf(user: AuthUser | null | undefined): Scope {
  return user?.id && user.email && !user.is_anonymous ? `user:${user.id}` : 'guest';
}

export function scopedKey(base: string, scope: Scope): string {
  return `${base}:${scope}`;
}

function parse<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * The account in a stored Supabase session. An expired token still names it:
 * with no signal it cannot be refreshed, and that is not being signed out.
 * Supabase removes the session itself when the server really rejects it.
 */
export function accountIn(raw: string | null): Account | null {
  const user = parse<{ user?: AuthUser }>(raw)?.user;
  if (!user || scopeOf(user) === 'guest') return null;
  const first = user.user_metadata?.first_name;
  return {
    id: user.id!,
    email: user.email!,
    firstName: typeof first === 'string' && first.trim() ? first.trim() : undefined,
  };
}

/** Who is signed in right now, read from the phone with no network. */
export function storedAccount(): Account | null {
  if (typeof window === 'undefined') return null;
  try {
    if (TEST_ACCOUNT && window.sessionStorage.getItem(TEST_SESSION_KEY) === '1') {
      return { id: 'test-account', email: TEST_ACCOUNT.email, firstName: TEST_ACCOUNT.firstName };
    }
    return accountIn(window.localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

// ---- Getting storage ready --------------------------------------------------

/** Moves a value without overwriting one, and puts it back if the write fails. */
function move(store: Store, from: string, to: string): void {
  const value = store.getItem(from);
  if (value === null || store.getItem(to) !== null) return;
  // Removed first, so a nearly full store has room for it under the new name.
  store.removeItem(from);
  try {
    store.setItem(to, value);
  } catch {
    store.setItem(from, value);
  }
}

/** Whether old, unowned data holds anything a stranger should not be shown. */
function holdsPrivateData(store: Store): boolean {
  const size = (value: unknown) => (value && typeof value === 'object' ? Object.keys(value).length : 0);
  const read = (key: string) => parse<Record<string, unknown>>(store.getItem(key));

  const state = read(STATE_KEY);
  if (state?.name || state?.assessment) return true;
  if (['sessions', 'reflections', 'sleepLogs', 'ratings'].some((field) => size(state?.[field]) > 0)) return true;

  const support = read('serenity.support.v1');
  if (size(support?.history) > 0 || size(support?.appointments) > 0) return true;

  return (
    size(read('serenity.kapwa.v1')) > 1 || // more than the welcome
    ['serenity.mixes.v1', 'serenity.schedule.v1', 'serenity.resume.v1'].some((key) => size(read(key)) > 0)
  );
}

/**
 * Readies storage for `scope`. Safe to run on every load.
 *
 * Data from builds before stores had owners goes to the account it last
 * synced with, else to whoever is signed in. Failing both, anything private is
 * set aside under `unclaimed`: shown to nobody, and not erased.
 *
 * What a guest does carries into the first account this phone sees, and only
 * the first: later, it could be anyone's.
 */
export function prepareStorage(store: Store, scope: Scope, accounts: boolean): void {
  const meta = parse<{ legacyOwner?: Scope; hadAccount?: boolean }>(store.getItem(META_KEY)) ?? {};
  const old = PERSONAL_KEYS.filter((key) => store.getItem(key) !== null);

  if (old.length > 0) {
    if (!meta.legacyOwner) {
      const syncedWith = store.getItem(OLD_OWNER_KEY);
      meta.legacyOwner = syncedWith
        ? `user:${syncedWith}`
        : scope !== 'guest'
          ? scope
          : accounts && holdsPrivateData(store)
            ? 'unclaimed'
            : 'guest';
      if (meta.legacyOwner !== 'guest') meta.hadAccount = true;
      // Saved before anything moves, so an interrupted move ends with the same owner.
      store.setItem(META_KEY, JSON.stringify(meta));
    }

    const state = parse<{ onboarded?: boolean; settings?: { lightMode?: boolean } }>(store.getItem(STATE_KEY));
    if (state && store.getItem(DEVICE_KEY) === null) {
      store.setItem(
        DEVICE_KEY,
        JSON.stringify({ onboarded: state.onboarded === true, lightMode: state.settings?.lightMode === true }),
      );
    }

    for (const key of old) move(store, key, scopedKey(key, meta.legacyOwner));
  }

  if (scope !== 'guest' && !meta.hadAccount) {
    meta.hadAccount = true;
    store.setItem(META_KEY, JSON.stringify(meta));
    for (const key of PERSONAL_KEYS) move(store, scopedKey(key, 'guest'), scopedKey(key, scope));
  }
}

// ---- This page ----------------------------------------------------------------

let opened: Scope | null = null;

/** The owner of this page's data, fixed at its first use. */
export function personalScope(): Scope {
  if (typeof window === 'undefined') return 'guest';
  if (opened) return opened;

  opened = scopeOf(storedAccount());
  const accounts =
    TEST_ACCOUNT !== null ||
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    );
  try {
    prepareStorage(window.localStorage, opened, accounts);
  } catch {
    // Storage is blocked or full: whatever could not move stays where it was.
  }
  return opened;
}

/** The storage key for one of this reader's personal stores. */
export function personalKey(base: string): string {
  return scopedKey(base, personalScope());
}

/** The account id this page belongs to, or null for a guest. */
export function personalAccountId(): string | null {
  const scope = personalScope();
  return scope.startsWith('user:') ? scope.slice('user:'.length) : null;
}

/** Whether someone else has signed in, or out, since this page loaded. */
export function accountHasChanged(): boolean {
  return scopeOf(storedAccount()) !== personalScope();
}

/**
 * Whether a Supabase user is this page's reader. Checked before anything goes
 * to or comes from the server: the session can change before the page does.
 */
export function isThisReader(user: AuthUser | null | undefined): boolean {
  return scopeOf(user) === personalScope();
}

export interface DeviceState {
  onboarded?: boolean;
  lightMode?: boolean;
}

export function readDevice(): DeviceState {
  try {
    personalScope(); // brings the old keys across first
    return parse<DeviceState>(window.localStorage.getItem(DEVICE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function writeDevice(value: DeviceState): void {
  try {
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify(value));
  } catch {
    // The tour and theme are simply not remembered.
  }
}
