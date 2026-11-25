'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import NotFound from '@/app/not-found';
import { allowForward, exportedPageExists, withTrailingSlash } from '@/lib/entry-forward';
import { isNativeShell } from '@/lib/notifications';
import { safePath } from '@/lib/safe-path';
import { useApp } from '@/providers/app-provider';

/**
 * The entry gate.
 *
 * A first-time visitor is sent through the three-step tour; everyone else goes
 * straight to the home screen. `onboarded` is read from localStorage, so this
 * waits for hydration before deciding rather than flashing the wrong screen.
 *
 * `router.replace` keeps the tour out of the back stack: finishing it and
 * pressing back should not drop you into onboarding again.
 */
export default function EntryPage() {
  const router = useRouter();
  const { onboarded, hydrated } = useApp();
  const [missing, setMissing] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    // The native app answers every extensionless path with this page, so a cold
    // load of /player/x (a reload, or a tapped reminder) lands here. Carry on to
    // where it was headed rather than dropping the reader on the home screen.
    const { pathname, search } = window.location;
    if (pathname !== '/') {
      // In the phone's build, to the address with its trailing slash: see withTrailingSlash.
      const native = isNativeShell();
      const target = safePath((native ? withTrailingSlash(pathname) : pathname) + search) ?? '/home/';
      let cancelled = false;
      // A page the app doesn't have would come straight back here, for ever
      // (see lib/entry-forward), so it is checked for first.
      void (native ? exportedPageExists(pathname) : Promise.resolve(true)).then((exists) => {
        if (cancelled) return;
        let storage: Storage | null = null;
        try {
          storage = window.sessionStorage;
        } catch {
          // Private mode without storage: the page check still applies.
        }
        if (exists && allowForward(target, Date.now(), storage)) {
          // The router takes a replace to the address it is already on as
          // nothing to do, which left this blank page up; a refresh fetches
          // that address's own page and shows it.
          if (target === pathname + search) router.refresh();
          else router.replace(target);
        } else {
          setMissing(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    router.replace(onboarded ? '/home' : '/welcome');
  }, [hydrated, onboarded, router]);

  if (missing) return <NotFound />;

  // Nothing to show while the stored flag is read — it takes one tick.
  return <div className="min-h-full bg-canvas" aria-hidden="true" />;
}
