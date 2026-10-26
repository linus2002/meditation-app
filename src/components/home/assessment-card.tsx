'use client';

import Image from 'next/image';
import Link from 'next/link';

import assessmentImage from '@/assets/images/assessment.jpg';
import { useApp } from '@/providers/app-provider';

/**
 * The invitation to take the assessment, under the collection shortcuts. It
 * stays hidden until the saved state is read, so it never flashes at someone
 * who has already taken it, and is gone for good once they have.
 */
export function AssessmentCard() {
  const { assessment, hydrated } = useApp();
  if (!hydrated || assessment) return null;

  return (
    <section aria-labelledby="assessment-title" className="pt-7">
      <h2
        id="assessment-title"
        className="px-5 text-[clamp(1.0625rem,4.8vw,1.25rem)] font-medium leading-tight tracking-[-0.01em] text-ink"
      >
        Let’s get to know you
      </h2>

      <div className="mt-4 px-5">
        {/* Cropped short: the photograph is a banner here, not the point. */}
        <div className="relative aspect-[3/1] overflow-hidden rounded-[16px]">
          <Image
            src={assessmentImage}
            alt=""
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            placeholder="blur"
            className="object-cover object-[50%_28%]"
          />
        </div>

        <p className="mt-3 text-body-sm leading-[1.45] text-ink-muted">
          Tell us a little about your days, your sleep and what helps you unwind. We’ll shape
          your practice around you, with sessions that feel made for you.
        </p>

        {/* The same solid pill as Start session in the Recommended rail. */}
        <Link
          href="/assessment"
          className="mt-4 flex h-10 w-fit items-center rounded-full bg-black px-5 text-[0.8125rem] font-medium text-white [[data-theme=dark]_&]:bg-white [[data-theme=dark]_&]:text-black transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          Take assessment
        </Link>
      </div>
    </section>
  );
}
