'use client';

import Link from 'next/link';
import { LogIn, Mail } from 'lucide-react';

import { GradientButton } from '@/components/shared/gradient-button';
import { SUPPORT_EMAIL } from '@/data/support-contact';
import { loginHref } from '@/hooks/use-account';

/** What usually stops an emailed sign-in code, in the order worth checking. */
const tips = [
  {
    title: 'The code hasn’t arrived',
    body: 'It can take a minute. Look in spam, junk or promotions, and search your inbox for “Serenity”.',
  },
  {
    title: 'The code doesn’t work',
    body: 'Only the newest code works. If you asked more than once, use the last email, or wait a minute and tap Resend code.',
  },
  {
    title: 'Wrong address',
    body: 'Check the address for a typo. A code always goes to exactly the address you typed.',
  },
  {
    title: 'No account yet',
    body: 'Signing in needs an account. Choose Create Account on the sign-in screen instead.',
  },
];

/**
 * Help for someone not signed in, often because signing in is what's going
 * wrong. The support conversations belong to an account, so a guest gets the
 * usual fixes and, where one is set, an address to write to instead.
 */
export function GuestHelp() {
  return (
    <div className="mt-6 px-5">
      <p className="text-body-sm leading-relaxed text-ink-muted">
        Having trouble signing in? These fix most problems.
      </p>

      <ul className="mt-4 space-y-2.5">
        {tips.map((tip) => (
          <li key={tip.title} className="rounded-tile bg-surface p-4">
            <p className="text-body-sm font-semibold leading-tight text-ink">{tip.title}</p>
            <p className="mt-1 text-caption leading-relaxed text-ink-muted">{tip.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-tile bg-surface p-4">
        <p className="text-body-sm font-semibold leading-tight text-ink">Still stuck?</p>
        <p className="mt-1 text-caption leading-relaxed text-ink-muted">
          {SUPPORT_EMAIL
            ? 'Write to the Serenity team and say which email address you’re signing in with.'
            : 'Once you’re signed in, you can message the Serenity team from this screen.'}
        </p>
        {SUPPORT_EMAIL ? (
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Help signing in to Serenity')}`}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-overlay/15 text-body-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Mail className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Email {SUPPORT_EMAIL}
          </a>
        ) : null}
        <GradientButton asChild className="mt-3 h-11 w-full gap-2 text-body-sm">
          <Link href={loginHref('/help')}>
            <LogIn className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Sign in
          </Link>
        </GradientButton>
      </div>
    </div>
  );
}
