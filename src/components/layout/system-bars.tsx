'use client';

import * as React from 'react';

/*
 * Capacitor's built-in SystemBars plugin, reached through the bridge like the
 * other native plugins so the web bundle never carries it. `DARK` means a dark
 * bar, so light icons; `LIGHT` the reverse.
 */
interface NativeSystemBars {
  setStyle(options: { style: 'DARK' | 'LIGHT' }): Promise<void>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: { SystemBars?: NativeSystemBars };
}

/**
 * Keeps the status-bar and navigation-bar icons legible on the app's canvas.
 *
 * The bands behind the system bars are painted in the app's own colours, and
 * the app has its own light/dark setting, separate from the phone's. Left to
 * the phone, a dark app on a light-themed phone gets dark icons on black. This
 * follows the app's `data-theme` instead, including when it is changed live.
 */
export function SystemBars() {
  React.useEffect(() => {
    const bridge = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
    if (!bridge?.isNativePlatform?.()) return;
    const bars = bridge.Plugins?.SystemBars;
    if (!bars) return;

    const root = document.documentElement;
    const apply = () => {
      void bars.setStyle({ style: root.dataset.theme === 'light' ? 'LIGHT' : 'DARK' }).catch(() => {});
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return null;
}
