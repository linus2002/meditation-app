'use client';

import * as React from 'react';

/**
 * Registers the offline service worker.
 *
 * Only over http/https and only in production: a Capacitor build serves the app
 * from a `capacitor://` (iOS) or local `http://localhost` (Android) origin where
 * the files are already on the device, so the worker is unnecessary there, and
 * in development it would just serve stale bundles.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is a bonus; the app works fine without it.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
