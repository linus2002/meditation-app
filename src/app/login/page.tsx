'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';

import { CreateAccountSheet, EmailSignInSheet } from '@/components/auth/auth-sheets';
import { SerenityMark } from '@/components/onboarding/serenity-mark';
import { GradientButton } from '@/components/shared/gradient-button';
import { accountFirstName } from '@/lib/auth';
import { useApp } from '@/providers/app-provider';

type OpenSheet = 'email' | 'create' | null;

/**
 * Sign in, straight after the onboarding tour or from Profile: the mark over a slow glow of the
 * app's blue and green, with Continue with Email, Create Account and a way to
 * skip. Each of the two opens as a sheet sliding up over this screen, and each
 * can hand over to the other.
 *
 * Signing in is optional — everything in Serenity works on the phone without
 * an account — so Skip goes straight to the home screen.
 *
 * Pinned to the dark palette, like the tour before it.
 */
export default function LoginPage() {
  const router = useRouter();
  const { name, setName } = useApp();
  const [sheet, setSheet] = React.useState<OpenSheet>(null);
  const [prefill, setPrefill] = React.useState('');

  const goHome = React.useCallback(() => router.replace('/home'), [router]);

  // Opening one sheet closes the other; the short pause lets the first slide
  // away before the next one slides up.
  const switchTo = (next: Exclude<OpenSheet, null>) => {
    setSheet(null);
    window.setTimeout(() => setSheet(next), 320);
  };

  const signedIn = async () => {
    // Greets a returning reader by the name they gave when they signed up,
    // unless this phone already has one.
    if (!name) {
      const first = await accountFirstName().catch(() => null);
      if (first) setName(first);
    }
    goHome();
  };

  const created = (firstName: string) => {
    if (firstName) setName(firstName);
    goHome();
  };

  return (
    <div data-theme="dark" className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-canvas">
      {/* The glow: blue drifting high, green low, both easing slowly about. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/3 -top-[12%] h-[65%] w-[140%] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(29,159,218,0.7),rgba(29,159,218,0))] blur-2xl" />
        <div className="absolute -right-1/3 bottom-[8%] h-[50%] w-[120%] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(97,166,68,0.5),rgba(97,166,68,0))] blur-2xl [animation-delay:-9s]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_55%_at_50%_45%,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_100%)]" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-7 pt-[calc(env(safe-area-inset-top,0px)+48px)]">
        <SerenityMark />
      </div>

      <div className="relative px-7 pb-7">
        <p className="text-center text-body-sm font-medium text-ink-soft">Quiet, wherever you are.</p>

        <GradientButton onClick={() => setSheet('email')} className="mt-5 h-[54px] w-full gap-2.5">
          <Mail className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          Continue with Email
        </GradientButton>

        <button
          type="button"
          onClick={() => {
            setPrefill('');
            setSheet('create');
          }}
          className="mt-3 h-[54px] w-full rounded-full border border-overlay/30 text-[0.9375rem] font-medium text-ink transition-colors duration-150 hover:border-overlay/55 hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Create Account
        </button>

        <button
          type="button"
          onClick={goHome}
          className="mx-auto mt-6 block rounded-full px-3 py-1 text-body-sm font-medium text-ink transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Skip for now
        </button>
        <p className="mt-1.5 text-center text-label text-ink-muted">
          An account keeps your name and Circles when you change phones
        </p>
      </div>

      <EmailSignInSheet
        open={sheet === 'email'}
        onOpenChange={(open) => setSheet(open ? 'email' : null)}
        onSignedIn={() => void signedIn()}
        onCreateAccount={(email) => {
          setPrefill(email);
          switchTo('create');
        }}
      />
      <CreateAccountSheet
        open={sheet === 'create'}
        onOpenChange={(open) => setSheet(open ? 'create' : null)}
        initialEmail={prefill}
        onCreated={created}
        onUseEmailSignIn={() => switchTo('email')}
      />
    </div>
  );
}
