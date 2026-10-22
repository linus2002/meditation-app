'use client';

import * as React from 'react';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

import { CODE_LENGTH, CodeInput } from '@/components/auth/code-input';
import { SerenityLogo } from '@/components/onboarding/serenity-mark';
import { GradientButton } from '@/components/shared/gradient-button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  AuthError,
  authErrorText,
  looksLikeEmail,
  sendSignInCode,
  sendSignUpCode,
  verifyEmailCode,
} from '@/lib/auth';
import { cn } from '@/lib/utils';

/** Seconds before another code can be asked for, matching Supabase's own limit. */
const RESEND_SECONDS = 60;

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

/**
 * A bottom sheet that slides up over the sign-in screen: the app's blue and
 * green glowing down from the top edge, the mark, a title and a line under it.
 * Pinned dark like the screen behind it, and as wide as the app, never the
 * whole window.
 */
function AuthSheetFrame({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-theme="dark"
        className="mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto overflow-x-hidden border-none bg-canvas pb-[calc(env(safe-area-inset-bottom,0px)+28px)] text-ink"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(120%_100%_at_15%_0%,rgba(29,159,218,0.75)_0%,rgba(29,159,218,0)_60%),radial-gradient(110%_100%_at_95%_0%,rgba(97,166,68,0.6)_0%,rgba(97,166,68,0)_55%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgb(var(--canvas))_100%)]"
        />
        {/* Grab handle, so the sheet reads as something that slid up. */}
        <div aria-hidden="true" className="relative mx-auto mt-3 h-1 w-10 rounded-full bg-white/40" />

        <div className="relative px-6 pt-8">
          <div className="flex items-center justify-center gap-2">
            <SerenityLogo className="h-6 w-6" />
            <span className="text-[1.0625rem] font-medium text-ink">Serenity</span>
          </div>
          <SheetTitle className="mt-8 text-center text-[1.625rem] font-semibold leading-tight tracking-[-0.02em]">
            {title}
          </SheetTitle>
          <SheetDescription className="mx-auto mt-2 max-w-[300px] text-center text-body-sm leading-relaxed text-ink-muted">
            {description}
          </SheetDescription>

          <div className="mt-8">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-body-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="mt-2 h-12 w-full rounded-2xl border border-transparent bg-overlay/[0.07] px-4 text-body-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-aurora-blue/70"
      />
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-caption leading-snug text-destructive">
      {children}
    </p>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <GradientButton type="submit" disabled={busy} className="mt-6 h-[54px] w-full gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </GradientButton>
  );
}

/**
 * The second half of both flows: the code from the email. It checks itself as
 * soon as the sixth digit lands, and offers a fresh code once the wait is over.
 */
function CodeStep({
  email,
  onResend,
  onVerified,
  onBack,
}: {
  email: string;
  onResend: () => Promise<void>;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [wait, setWait] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email, value);
      onVerified();
    } catch (failure) {
      setError(authErrorText(failure));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await onResend();
      setWait(RESEND_SECONDS);
    } catch (failure) {
      setError(authErrorText(failure));
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void verify(code);
      }}
    >
      <p className="text-center text-body-sm leading-relaxed text-ink-muted">
        Enter the {CODE_LENGTH}-digit code we sent to
        <br />
        <span className="font-medium text-ink">{email}</span>
      </p>

      <div className="mt-5">
        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          onComplete={(value) => void verify(value)}
          disabled={busy}
          invalid={Boolean(error)}
        />
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}

      <SubmitButton busy={busy}>Verify</SubmitButton>

      <div className="mt-5 flex items-center justify-between text-caption">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Use a different email
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={wait > 0}
          className="font-medium text-aurora-blue transition-opacity disabled:text-ink-faint"
        >
          {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ *
 * Continue with Email — sign in to an existing account
 * ------------------------------------------------------------------ */

export function EmailSignInSheet({
  open,
  onOpenChange,
  onSignedIn,
  onCreateAccount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn: () => void;
  /** Opens Create Account with the email already filled in. */
  onCreateAccount: (email: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<AuthError | null>(null);

  // Every opening starts clean.
  React.useEffect(() => {
    if (open) {
      setStep('email');
      setError(null);
    }
  }, [open]);

  const send = async () => {
    if (!looksLikeEmail(email)) {
      setError(new AuthError('invalid_email'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendSignInCode(email);
      setStep('code');
    } catch (failure) {
      setError(failure instanceof AuthError ? failure : new AuthError('unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      title={step === 'email' ? 'Welcome back' : 'Check your email'}
      description={
        step === 'email'
          ? 'Enter your email and we’ll send you a code to sign in. No password needed.'
          : 'One last step to sign you in.'
      }
    >
      {step === 'email' ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Field
            id="signin-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="eg. you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
          {error ? (
            <ErrorText>
              {authErrorText(error)}
              {error.code === 'no_account' ? (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => onCreateAccount(email)}
                    className="font-medium text-aurora-blue underline-offset-2 hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : null}
            </ErrorText>
          ) : null}
          <SubmitButton busy={busy}>Send code</SubmitButton>
        </form>
      ) : (
        <CodeStep
          email={email.trim()}
          onResend={() => sendSignInCode(email)}
          onVerified={onSignedIn}
          onBack={() => setStep('email')}
        />
      )}
    </AuthSheetFrame>
  );
}

/* ------------------------------------------------------------------ *
 * Create Account
 * ------------------------------------------------------------------ */

export function CreateAccountSheet({
  open,
  onOpenChange,
  initialEmail = '',
  onCreated,
  onUseEmailSignIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  /** Called with the first name once the code is confirmed. */
  onCreated: (firstName: string) => void;
  /** For someone who already has an account: switches to Continue with Email. */
  onUseEmailSignIn: () => void;
}) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState(initialEmail);
  const [step, setStep] = React.useState<'details' | 'code'>('details');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep('details');
      setError(null);
      if (initialEmail) setEmail(initialEmail);
    }
  }, [open, initialEmail]);

  const send = async () => {
    if (!firstName.trim()) {
      setError('Please add your first name.');
      return;
    }
    if (!looksLikeEmail(email)) {
      setError(authErrorText(new AuthError('invalid_email')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendSignUpCode(email, firstName, lastName);
      setStep('code');
    } catch (failure) {
      setError(authErrorText(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      title={step === 'details' ? 'Create Account' : 'Check your email'}
      description={
        step === 'details'
          ? 'Enter your details to create your account.'
          : 'Confirm your email to finish creating your account.'
      }
    >
      {step === 'details' ? (
        <>
          <button
            type="button"
            onClick={onUseEmailSignIn}
            className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border border-overlay/[0.16] bg-overlay/[0.03] text-body-sm font-medium text-ink transition-colors hover:border-overlay/30 hover:bg-overlay/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Mail className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Continue with Email
          </button>

          <div className="my-7 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-overlay/[0.14]" />
            <span className="text-body-sm text-ink-muted">Or</span>
            <span className="h-px flex-1 bg-overlay/[0.14]" />
          </div>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="signup-first"
                label="First Name"
                autoComplete="given-name"
                placeholder="eg. Maya"
                maxLength={32}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <Field
                id="signup-last"
                label="Last Name"
                autoComplete="family-name"
                placeholder="eg. Santos"
                maxLength={40}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="mt-4">
              <Field
                id="signup-email"
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="eg. you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <SubmitButton busy={busy}>Create Account</SubmitButton>
            <p className={cn('mt-4 text-center text-label leading-relaxed text-ink-faint')}>
              We’ll email you a code to confirm it’s you. No password needed.
            </p>
          </form>
        </>
      ) : (
        <CodeStep
          email={email.trim()}
          onResend={() => sendSignUpCode(email, firstName, lastName)}
          onVerified={() => onCreated(firstName.trim())}
          onBack={() => setStep('details')}
        />
      )}
    </AuthSheetFrame>
  );
}
