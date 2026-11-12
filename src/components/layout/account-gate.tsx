'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { currentPath, loginHref, useAccountStatus } from '@/hooks/use-account';

/**
 * Screens that start a practice or hold the reader's own entries. A guest can
 * browse everything else, and is sent to sign in on opening one of these,
 * then brought straight back here afterwards.
 *
 * A trailing slash marks "anything beneath, but not the list itself": a guest
 * may look through /yoga, but not start /yoga/<session>.
 */
const MEMBER_ROUTES = [
  '/player/',
  '/timer',
  '/yoga/',
  '/activities',
  '/stories/',
  '/support/',
  '/reflections',
  '/assessment',
  '/kapwa',
];

export function isMemberRoute(pathname: string): boolean {
  // The mobile build exports with trailing slashes: /timer/ is /timer.
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return MEMBER_ROUTES.some((route) =>
    route.endsWith('/') ? path.startsWith(route) : path === route || path.startsWith(`${route}/`),
  );
}

export function AccountGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const status = useAccountStatus();
  const gated = isMemberRoute(pathname);

  React.useEffect(() => {
    if (gated && status === 'guest') router.replace(loginHref(currentPath()));
  }, [gated, status, router]);

  // Nothing of a gated screen renders until the account is known, so a guest
  // never hears a session start before being moved on.
  if (gated && status !== 'member') return <div className="min-h-full bg-canvas" aria-hidden="true" />;
  return <>{children}</>;
}
