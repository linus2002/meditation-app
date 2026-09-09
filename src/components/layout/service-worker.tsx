'use client';

import * as React from 'react';

import { useAudio } from '@/providers/audio-provider';

/**
 * Registers the offline service worker and keeps the installed app current.
 *
 * Only over http/https and only in production: a Capacitor build serves the app
 * from a `capacitor://` (iOS) or local `http://localhost` (Android) origin where
 * the files are already on the device, so the worker is unnecessary there, and
 * in development it would just serve stale bundles.
 *
 * An installed PWA is rarely reloaded by hand — it is opened, backgrounded and
 * opened again for weeks. So a new deploy is picked up on three occasions: when
 * the page loads, whenever the app returns to the foreground, and hourly while
 * it stays open. When the new worker takes over, the page reloads itself.
 */
export function ServiceWorkerRegistrar() {
  const { playing } = useAudio();

  // Set when an update activated during playback, and the reload was held back.
  const [reloadPending, setReloadPending] = React.useState(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    // A page with no controller is installing for the first time. `clients.claim()`
    // will fire `controllerchange` for it, and that one is not an update.
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    const takeOver = () => {
      if (!wasControlled || reloading) return;
      reloading = true;
      // Audio survives nothing across a reload, so a session that is sounding
      // gets to finish; the flag below reloads once it stops.
      if (document.querySelector('[data-audio-playing="true"]')) {
        reloading = false;
        setReloadPending(true);
        return;
      }
      window.location.reload();
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

  // The held-back reload, once the soundscape has gone quiet.
  React.useEffect(() => {
    if (reloadPending && !playing) window.location.reload();
  }, [reloadPending, playing]);

  // Read by the reload guard above — the effect runs outside React's tree and
  // cannot see this component's props.
  return <span hidden data-audio-playing={playing ? 'true' : 'false'} />;
}
