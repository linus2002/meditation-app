import Link from 'next/link';
import { Compass } from 'lucide-react';

/**
 * Any address the app does not have: a mistyped link, or a session removed
 * since a reminder or a shared link pointed at it.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-canvas px-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
        <Compass className="h-6 w-6 text-ink-soft" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-[1.375rem] font-semibold leading-tight text-ink">This page isn’t here</h1>
      <p className="mt-2 max-w-[300px] text-body-sm leading-relaxed text-ink-muted">
        It may have moved, or the session it showed is no longer in Serenity.
      </p>
      <Link
        href="/home"
        replace
        className="mt-7 flex h-12 items-center rounded-full bg-aurora-blue px-6 text-body-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        Go to Home
      </Link>
    </div>
  );
}
