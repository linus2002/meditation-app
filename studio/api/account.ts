import { ACCOUNT_ENV_NAMES, createAccountDeletion } from './_lib/account.js';
import { pickSupportEnv } from './_lib/support.js';

/**
 * Account deletion, for the app's Profile screen: POST /api/account. See
 * _lib/account.ts. Answers any origin for the same reason as /api/support:
 * it uses only the bearer token, never cookies.
 */

const env = {
  ...pickSupportEnv(process.env),
  ...Object.fromEntries(ACCOUNT_ENV_NAMES.map((name) => [name, process.env[name]?.trim()]).filter(([, v]) => v)),
};

const handle = createAccountDeletion(env);

export const POST = handle;
export const OPTIONS = handle;
