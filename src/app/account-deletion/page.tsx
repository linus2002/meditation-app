import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your account — Serenity',
  description: 'How to delete your Serenity account and the data kept with it.',
};

/**
 * The public page app stores ask for: how to delete an account, readable
 * without the app installed. Deleting itself happens on Profile, after
 * signing in, in the app or on the web.
 */
export default function AccountDeletionPage() {
  return (
    <main className="min-h-full bg-canvas px-6 pb-12 pt-[calc(env(safe-area-inset-top,0px)+40px)] text-ink">
      <h1 className="text-[1.5rem] font-semibold leading-tight">Delete your Serenity account</h1>

      <ol className="mt-6 list-decimal space-y-2 pl-5 text-body-sm leading-relaxed text-ink-soft">
        <li>Open Serenity on your phone, or on the web at this site.</li>
        <li>Sign in with the email you use for your account.</li>
        <li>Go to Profile, then choose Delete account at the foot of the screen.</li>
        <li>Type DELETE to confirm.</li>
      </ol>

      <h2 className="mt-8 text-body-sm font-semibold">What is deleted</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body-sm leading-relaxed text-ink-soft">
        <li>Your sign-in and the sessions, places, ratings and likes synced to it.</li>
        <li>Your conversations with the Serenity team.</li>
        <li>Usage data shared for analytics, if you allowed it.</li>
        <li>Everything your account kept on the phone you delete it from.</li>
      </ul>
      <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">
        Deletion is immediate and can’t be undone. Anything you kept on another phone without signing
        in stays on that phone until you remove the app.
      </p>

      <Link
        href="/profile"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-aurora-blue px-6 text-body-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        Go to Profile
      </Link>
    </main>
  );
}
