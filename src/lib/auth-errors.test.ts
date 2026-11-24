import { describe, expect, it } from 'vitest';

import { authErrorFrom } from '@/lib/auth';

describe('authErrorFrom', () => {
  it('says a bad address is a bad address, not a bad code', () => {
    expect(authErrorFrom({ code: 'email_address_invalid', message: 'Email address "x@y" is invalid' }).code).toBe('invalid_email');
    expect(authErrorFrom({ message: 'Unable to validate email address: invalid format' }).code).toBe('invalid_email');
  });

  it('still says a wrong or expired code is one', () => {
    expect(authErrorFrom({ code: 'otp_expired', message: 'Token has expired or is invalid' }).code).toBe('invalid_code');
    expect(authErrorFrom({ message: 'Token has expired or is invalid' }).code).toBe('invalid_code');
  });

  it('calls a dropped connection offline, Safari’s wording included', () => {
    expect(authErrorFrom({ message: 'Failed to fetch' }).code).toBe('offline');
    expect(authErrorFrom({ message: 'Load failed' }).code).toBe('offline');
  });
});
