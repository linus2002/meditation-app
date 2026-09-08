'use client';

import * as React from 'react';
import { Check, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports installed apps through a non-standard flag.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Offers to install the app.
 *
 * Chrome and the Android browsers fire `beforeinstallprompt`, which can be
 * deferred and replayed from a button. iOS Safari has no such event and never
 * will, so there it falls back to telling you where the control is — which is
 * the only thing that actually helps an iPhone user.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS: no install event exists, so detect Safari on an Apple handheld.
    const ua = window.navigator.userAgent;
    const isIosSafari =
      /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIosHint(isIosSafari && !isStandalone());

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!mounted) return null;

  if (installed) {
    return (
      <p className="flex items-center gap-2 rounded-tile bg-[#141733] px-4 py-3.5 text-[12.5px] text-ink-muted">
        <Check className="h-4 w-4 shrink-0 text-aurora-cyan" strokeWidth={2.2} />
        Installed on this device
      </p>
    );
  }

  if (iosHint) {
    return (
      <div className="flex items-center gap-3.5 rounded-tile bg-[#141733] px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
          <Share className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.8} />
        </span>
        <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink-muted">
          <span className="block text-[13.5px] font-medium leading-tight text-ink">
            Add to Home Screen
          </span>
          Tap Share, then <span className="text-ink-soft">Add to Home Screen</span>, to use Serenity
          offline.
        </p>
      </div>
    );
  }

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          setDeferred(null);
        }}
        className="flex w-full items-center gap-3.5 rounded-tile bg-[#141733] px-4 py-3.5 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action-pill">
          <Download className="h-[17px] w-[17px] text-white" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium leading-tight text-ink">
            Install Serenity
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted">
            Add it to your home screen and use it offline
          </span>
        </span>
      </button>
    );
  }

  return null;
}
