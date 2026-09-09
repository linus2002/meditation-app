'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  WelcomeIntent,
  WelcomeIntro,
  WelcomeLibrary,
} from '@/components/onboarding/welcome-steps';
import { useApp } from '@/providers/app-provider';

/**
 * The first-run tour: three steps, shown once.
 *
 * Finishing or skipping sets `onboarded`, which persists to localStorage — so
 * it appears on a fresh install and never again, on the web or inside the
 * native shell. `/` is the gate that decides whether anyone is sent here.
 *
 * Pinned to the dark palette whatever the app preference is: the aurora and the
 * full-bleed photography behind these steps are dark artwork, and a light
 * treatment would leave the headlines sitting on top of them unreadable.
 */
export default function WelcomePage() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const [step, setStep] = React.useState(0);

  const finish = React.useCallback(() => {
    completeOnboarding();
    router.replace('/home');
  }, [completeOnboarding, router]);

  return (
    <div data-theme="dark" className="contents">
      {step === 0 ? <WelcomeIntro onNext={() => setStep(1)} onSkip={finish} /> : null}
      {step === 1 ? <WelcomeLibrary onNext={() => setStep(2)} /> : null}
      {step === 2 ? <WelcomeIntent onDone={finish} /> : null}
    </div>
  );
}
