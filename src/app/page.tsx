'use client';

import Link from 'next/link';

import { DiagonalSlashes, WaveLines } from '@/components/shared/decor';
import { GradientButton } from '@/components/shared/gradient-button';
import { useApp } from '@/providers/app-provider';

/**
 * Intro screen. Proportions follow the reference: the headline sits at roughly
 * 13% of the screen width, the body copy wraps to three lines, and the pill
 * clears the bottom edge by a little under 30px.
 */
export default function OnboardingPage() {
  const { completeOnboarding } = useApp();

  return (
    <div className="relative flex min-h-full flex-col">
      <WaveLines className="left-0 top-0 h-[300px] w-full" />
      <div className="relative mt-auto px-7 pb-[clamp(20px,3.3vh,28px)]">
        <DiagonalSlashes className="relative mb-[clamp(26px,4.7vh,40px)] ml-[36%] w-[59%]" />
        <h1 className="text-[clamp(34px,12.8vw,50px)] leading-[1.11] tracking-[-0.025em] text-ink">
          <span className="block font-light">Keep track</span>
          <span className="block font-light">
            of <span className="font-bold">Your</span>
          </span>
          <span className="block font-bold">Health</span>
        </h1>

        <p className="mt-[clamp(12px,1.9vh,16px)] max-w-[272px] text-[clamp(11.5px,3.33vw,13px)] font-normal leading-[1.62] text-ink-muted">
          Lorem ipsum dolor sit amet consectetur. Diam malesuada vestibulum adipiscing nisi amet
          vitae.
        </p>

        <GradientButton asChild className="mt-[clamp(22px,4.3vh,36px)] h-[clamp(52px,7.35vh,62px)] w-full">
          <Link href="/home" onClick={completeOnboarding}>
            Get Started
          </Link>
        </GradientButton>
      </div>
    </div>
  );
}
