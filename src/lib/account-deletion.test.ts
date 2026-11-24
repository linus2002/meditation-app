import { describe, expect, it } from 'vitest';

import { localKeysOf } from '@/lib/account-deletion';

describe('localKeysOf', () => {
  const keys = [
    'serenity.state.v1:user:anna',
    'serenity.kapwa.v1:user:anna',
    'serenity.mixes.v1:user:anna-2',
    'serenity.state.v1:user:ben',
    'serenity.state.v1:guest',
    'serenity.device.v1',
    'ph_serenity_user_anna_posthog',
    '__ph_opt_in_out_serenity_consent_user_anna',
    'serenity.auth.v1',
  ];

  it('finds everything on the phone that belongs to that account, and nothing else', () => {
    expect(localKeysOf(keys, 'anna').sort()).toEqual([
      '__ph_opt_in_out_serenity_consent_user_anna',
      'ph_serenity_user_anna_posthog',
      'serenity.kapwa.v1:user:anna',
      'serenity.state.v1:user:anna',
    ]);
  });
});
