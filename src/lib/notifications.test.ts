import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  deliveryMode,
  isNativeShell,
  onNotificationTap,
  sendTestNotification,
  clearLegacyCircleReminders,
  startReminders,
} from '@/lib/notifications';

interface Scheduled {
  id: number;
  schedule?: unknown;
  isExactNotification?: boolean;
}

function fakePlugin() {
  return {
    checkPermissions: vi.fn(async () => ({ display: 'granted' as const })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' as const })),
    schedule: vi.fn(async (_options: { notifications: Scheduled[] }) => ({})),
    cancel: vi.fn(async (_options: { notifications: { id: number }[] }) => ({})),
    addListener: vi.fn(),
  };
}

/** Stands in for the native shell, with or without the plugin. */
function installShell(plugin: ReturnType<typeof fakePlugin> | null) {
  vi.stubGlobal('window', {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: plugin ? { LocalNotifications: plugin } : {},
    },
    // A WebView may well expose this; it must not count as a way to deliver.
    Notification: {},
  });
  vi.stubGlobal('navigator', { serviceWorker: {} });
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('in the native shell', () => {
  it('is native once the plugin is there', () => {
    installShell(fakePlugin());
    expect(isNativeShell()).toBe(true);
    expect(deliveryMode()).toBe('native');
  });

  it('is unsupported without the plugin, never the web route', () => {
    installShell(null);
    expect(isNativeShell()).toBe(true);
    expect(deliveryMode()).toBe('unsupported');
  });

  it('never asks for exact alarms, which would open system settings on launch', async () => {
    const plugin = fakePlugin();
    installShell(plugin);

    startReminders(['reminders', 'bedtime', 'inspiration']);
    await settled();

    const scheduled = plugin.schedule.mock.calls.flatMap(([options]) => options.notifications);
    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled.every((entry) => entry.isExactNotification === false)).toBe(true);
  });

  it('cancels circle reminders left scheduled by an earlier build', async () => {
    const plugin = fakePlugin();
    installShell(plugin);

    clearLegacyCircleReminders();
    await settled();

    const cancelled = plugin.cancel.mock.calls.flatMap(([options]) => options.notifications);
    expect(cancelled.map((entry) => entry.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => 1000 + index),
    );
  });

  it('shows the test notification straight away', async () => {
    const plugin = fakePlugin();
    installShell(plugin);

    expect(await sendTestNotification()).toBe('sent');
    expect(plugin.schedule.mock.calls[0][0].notifications[0].schedule).toBeUndefined();
  });

  it('opens the screen a tapped notification points at, and stops listening', async () => {
    const plugin = fakePlugin();
    const remove = vi.fn(async () => {});
    plugin.addListener.mockReturnValue({ remove });
    installShell(plugin);

    const open = vi.fn();
    const teardown = onNotificationTap(open);
    plugin.addListener.mock.calls[0][1]({ notification: { extra: { url: '/sleep' } } });
    expect(open).toHaveBeenCalledWith('/sleep');

    teardown();
    await settled();
    expect(remove).toHaveBeenCalled();
  });
});
