'use client';

import * as React from 'react';
import { BellOff, BellRing, Loader2, Moon, Send, Sun, Users } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton } from '@/components/shared/skeleton';
import { Switch } from '@/components/ui/switch';
import { useReminders } from '@/hooks/use-reminders';
import { deliveredLog, sendTestNotification, type TestResult } from '@/lib/notifications';
import { dayKey, nextOccurrence, reminderDefinitions } from '@/lib/reminders';
import { useApp } from '@/providers/app-provider';
import { useCircles } from '@/providers/circles-provider';

const reminderIcons: Record<string, typeof Sun> = { reminders: Sun, bedtime: Moon };

const reminderLabels: Record<string, string> = {
  reminders: 'Daily reminder',
  bedtime: 'Bedtime wind down',
};

const testMessages: Record<TestResult, string> = {
  sent: 'Sent. If nothing appeared, check that Focus or Do Not Disturb is off.',
  blocked: 'Notifications are blocked, so the test could not be shown.',
  unsupported: 'This browser cannot show notifications.',
  failed: 'The browser refused the notification. Installing Serenity to your home screen usually fixes this.',
};

/**
 * Everything about notifications in one place: whether this device can show
 * them at all, the two scheduled reminders, and a way to prove it works.
 *
 * The status card comes first on purpose. Whether a 07:00 nudge will arrive
 * depends on the platform and a permission that can be withdrawn in settings
 * at any time, and a reader deserves to know that before trusting a toggle.
 */
export default function NotificationsPage() {
  const { settings, hydrated } = useApp();
  const { permission, mode, enable, disable, allow } = useReminders();
  const { memberships, reminders: circleReminders, setReminders: setCircleReminders } = useCircles();

  const toggleCircleReminders = async (next: boolean) => {
    if (!next) {
      setCircleReminders(false);
      return;
    }
    const state = permission === 'granted' ? 'granted' : await allow();
    if (state === 'granted') setCircleReminders(true);
  };

  // Resolved on the client: the page is prerendered, so the build time must
  // not leak into "next at" or "last delivered".
  const [now, setNow] = React.useState<Date | null>(null);
  const [delivered, setDelivered] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const refresh = () => {
      setNow(new Date());
      setDelivered(deliveredLog());
    };
    refresh();
    const timer = window.setInterval(refresh, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<TestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestResult(await sendTestNotification());
    setTesting(false);
  };

  const ready = hydrated && now !== null;
  const granted = permission === 'granted';

  const status =
    mode === 'unsupported'
      ? {
          icon: BellOff,
          title: 'Not available here',
          body: 'This browser cannot show notifications. Installing Serenity to your home screen usually enables them.',
        }
      : permission === 'denied'
        ? {
            icon: BellOff,
            title: 'Notifications are blocked',
            body: 'Allow them for Serenity in your browser or system settings, then come back here.',
          }
        : permission === 'prompt'
          ? {
              icon: BellOff,
              title: 'Not switched on yet',
              body: 'Serenity needs your permission before it can send a reminder.',
            }
          : {
              icon: BellRing,
              title: 'Notifications are on',
              body:
                mode === 'native'
                  ? 'Reminders are scheduled with your phone, so they arrive even when Serenity is closed.'
                  : 'In a browser, reminders arrive while Serenity is open. Install it to your home screen for the best chance of seeing them.',
            };

  const StatusIcon = status.icon;

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Reminders and alerts" title="Notifications" />

      <section className="mt-6 px-5">
        {!ready ? (
          <Skeleton className="h-[120px]" />
        ) : (
          <div className="rounded-tile bg-surface p-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
                <StatusIcon className="h-[18px] w-[18px] text-ink-soft" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-ink">{status.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{status.body}</p>
              </div>
            </div>

            {mode !== 'unsupported' && permission === 'prompt' ? (
              <GradientButton
                type="button"
                onClick={() => void allow()}
                className="mt-4 h-11 w-full text-[13px]"
              >
                Allow notifications
              </GradientButton>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-6 px-5">
        <SectionTitle>Scheduled</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {reminderDefinitions.map((reminder) => {
            const Icon = reminderIcons[reminder.id] ?? BellRing;
            const checked = Boolean(settings[reminder.id]) && granted;

            return (
              <li
                key={reminder.id}
                className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
                  <Icon className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`notification-${reminder.id}`}
                    className="block text-[13.5px] font-medium leading-tight text-ink"
                  >
                    {reminderLabels[reminder.id] ?? reminder.title}
                  </label>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                    {`"${reminder.title}" at ${reminder.time}`}
                  </p>
                  {ready ? (
                    <p className="mt-1 text-[11px] leading-none text-ink-faint">
                      {checked
                        ? describeSchedule(reminder.time, now, delivered[reminder.id])
                        : 'Off'}
                    </p>
                  ) : null}
                </div>
                <Switch
                  id={`notification-${reminder.id}`}
                  checked={checked}
                  disabled={mode === 'unsupported'}
                  onCheckedChange={(next) => {
                    if (next) void enable(reminder.id);
                    else disable(reminder.id);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {memberships.length > 0 ? (
        <section className="mt-6 px-5">
          <SectionTitle>Circles</SectionTitle>
          <div className="mt-3 flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
              <Users className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="notification-circles"
                className="block text-[13.5px] font-medium leading-tight text-ink"
              >
                Before circle sessions
              </label>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                {`Ten minutes before ${memberships.map((entry) => entry.circle.name).join(' and ')} sits.`}
              </p>
            </div>
            <Switch
              id="notification-circles"
              checked={circleReminders && granted}
              disabled={mode === 'unsupported'}
              onCheckedChange={(next) => void toggleCircleReminders(next)}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-6 px-5">
        <SectionTitle>Try it</SectionTitle>
        <div className="mt-3 rounded-tile bg-surface p-4">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Send one notification now to see what a reminder looks like and check that this device
            shows it.
          </p>
          <GradientButton
            type="button"
            onClick={() => void runTest()}
            disabled={testing || !granted}
            className="mt-4 h-11 w-full gap-2 text-[13px]"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
            ) : (
              <Send className="h-4 w-4" strokeWidth={1.8} />
            )}
            Send a test notification
          </GradientButton>
          {testResult ? (
            <p role="status" className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
              {testMessages[testResult]}
            </p>
          ) : !granted && ready ? (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
              Allow notifications above to send a test.
            </p>
          ) : null}
        </div>
      </section>

      {mode === 'web' ? (
        <p className="mt-4 px-6 text-[11.5px] leading-relaxed text-ink-faint">
          Serenity has no server to wake it, so a browser reminder is sent by the app itself. If
          the app is not open within half an hour of the time, that day&apos;s reminder is skipped
          rather than arriving late.
        </p>
      ) : null}
    </div>
  );
}

/** "Next today at 07:00 · delivered today", from the reader's own clock. */
function describeSchedule(time: string, now: Date, lastDelivered: string | undefined): string {
  const next = nextOccurrence(time, now);
  const day = dayKey(next) === dayKey(now) ? 'today' : 'tomorrow';
  const sentToday = lastDelivered === dayKey(now);
  return `Next ${day} at ${time}${sentToday ? ' · delivered today' : ''}`;
}
