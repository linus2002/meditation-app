'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Digits in the emailed code. Must match Supabase → Authentication → Sign In /
 * Providers → Email → "Email OTP Length" (6 to 10). Defaults to 6.
 */
const configured = Number(process.env.NEXT_PUBLIC_AUTH_CODE_LENGTH);
export const CODE_LENGTH =
  Number.isInteger(configured) && configured >= 6 && configured <= 10 ? configured : 6;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once the last digit is typed, so the code can be checked at once. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * The code from the email, drawn as one box per digit.
 *
 * Underneath it is one ordinary input rather than six, which is what lets a
 * phone offer the code straight from the email (`one-time-code`) and lets a
 * pasted code land whole. The boxes only mirror its value.
 */
export function CodeInput({ value, onChange, onComplete, disabled, invalid }: CodeInputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={cn('grid', CODE_LENGTH > 6 ? 'gap-1.5' : 'gap-2')}
        style={{ gridTemplateColumns: `repeat(${CODE_LENGTH}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const current = focused && index === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <span
              key={index}
              className={cn(
                'flex h-14 items-center justify-center rounded-xl border bg-overlay/[0.05] text-[1.25rem] font-semibold text-ink transition-colors',
                invalid
                  ? 'border-destructive/70'
                  : current
                    ? 'border-aurora-blue'
                    : 'border-overlay/[0.12]',
              )}
            >
              {value[index] ?? ''}
            </span>
          );
        })}
      </div>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Code from your email"
        aria-invalid={invalid || undefined}
        maxLength={CODE_LENGTH}
        value={value}
        disabled={disabled}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
          onChange(next);
          if (next.length === CODE_LENGTH) onComplete?.(next);
        }}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
