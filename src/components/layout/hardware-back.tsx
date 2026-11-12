'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { canGoBackInApp, isTabRoot, normalizePath } from '@/hooks/use-back';
import { useApp } from '@/providers/app-provider';

/*
 * The App plugin is reached through the Capacitor bridge rather than an import,
 * like the notifications plugin, so the web bundle never carries it. In a
 * browser the bridge is absent and the browser's own Back already does the job.
 */
interface NativeApp {
  addListener(event: 'backButton', handler: () => void): Promise<{ remove(): Promise<void> }>;
  minimizeApp(): Promise<void>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { App?: NativeApp };
}

function nativeApp(): NativeApp | null {
  const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!bridge?.isNativePlatform?.()) return null;
  return bridge.Plugins?.App ?? null;
}

/**
 * Android's system Back, walked back through the reader's own path.
 *
 * Without a listener the native shell simply closes the app on the first press.
 * With one, Back peels off whatever is on top, in the order a reader expects:
 * an open sheet or dialog first, then the previous screen, then home. Only on
 * home with nothing behind it does the app step aside, and it is sent to the
 * background rather than closed, the way Android's own apps behave.
 */
export function HardwareBack() {
  const router = useRouter();
  const pathname = usePathname();

  // Read inside the listener, which is registered once.
  const { onboarded } = useApp();

  const pathnameRef = React.useRef(pathname);
  pathnameRef.current = pathname;
  const onboardedRef = React.useRef(onboarded);
  onboardedRef.current = onboarded;

  React.useEffect(() => {
    const app = nativeApp();
    if (!app) return;

    const onBack = () => {
      // Radix sheets and the app's own modals (the end-session prompt) all close
      // on Escape, so Back hands them that and lets each decide what closing means.
      if (document.querySelector('[role="dialog"][data-state="open"], [aria-modal="true"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      const path = normalizePath(pathnameRef.current);

      // Home is the bottom of the app. Back here leaves, whatever came before
      // it, rather than replaying old screens behind the home screen.
      if (path === '/home') {
        void app.minimizeApp();
        return;
      }
      // Before onboarding is done there is no home to fall back to: going there
      // would skip the tour. Step back inside it, or leave.
      if (!onboardedRef.current) {
        if (canGoBackInApp()) router.back();
        else void app.minimizeApp();
        return;
      }
      // The other tabs are siblings of home, not children of whatever was open
      // before them, so Back goes home (Android's own tab-bar convention).
      if (isTabRoot(path)) {
        router.replace('/home');
        return;
      }
      if (canGoBackInApp()) {
        router.back();
        return;
      }
      // Opened cold on an inner screen (a tapped reminder, say): home is the
      // way back, and replacing keeps Back from bouncing between the two.
      router.replace('/home');
    };

    const subscription = app.addListener('backButton', onBack);
    return () => {
      void subscription.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
