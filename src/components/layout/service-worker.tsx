'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Registers the offline service worker and keeps the installed app current.
 *
 * Only in a browser and only in production: a Capacitor build serves the app
 * from a `capacitor://` (iOS) or `https://localhost` (Android) origin where the
 * files are already on the device, so the worker is unnecessary there, and in
 * development it would just serve stale bundles. The Android origin is https,
 * so the protocol alone cannot tell it apart; the native bridge can.
 *
 * An installed PWA is rarely reloaded by hand — it is opened, backgrounded and
 * opened again for weeks. So a new deploy is picked up on three occasions: when
 * the page loads, whenever the app returns to the foreground, and hourly while
 * it stays open. When the new worker takes over, the page reloads at the next
 * change of screen: never under a session, a timer or a half-typed entry.
 */
export function ServiceWorkerRegistrar() {
  const pathname = usePathname();
  // Set when an update has taken over; the reload waits for a change of screen.
  const [reloadPending, setReloadPending] = React.useState(false);
  const pendingFromRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    const bridge = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    if (bridge?.isNativePlatform?.()) return;

    // A page with no controller is installing for the first time. `clients.claim()`
    // will fire `controllerchange` for it, and that one is not an update.
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    const takeOver = () => {
      if (!wasControlled || reloading) return;
      reloading = true;
      pendingFromRef.current = window.location.pathname;
      setReloadPending(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', takeOver);

    let registration: ServiceWorkerRegistration | undefined;
    let timer: number | undefined;

    const checkForUpdate = () => {
      // `update()` refetches /sw.js. `updateViaCache: 'none'` above is what
      // stops that request being answered from the HTTP cache.
      registration?.update().catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          registration = reg;
          checkForUpdate();
          document.addEventListener('visibilitychange', onVisible);
          timer = window.setInterval(checkForUpdate, 60 * 60 * 1000);
        })
        .catch(() => {
          // Offline support is a bonus; the app works fine without it.
        });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', takeOver);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, []);

  // Leaving a screen ends whatever was on it, so that is when to load the update.
  React.useEffect(() => {
    if (reloadPending && pathname !== pendingFromRef.current) window.location.reload();
  }, [reloadPending, pathname]);

  return null;
}
