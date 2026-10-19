'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';

import { InstallPrompt } from '@/components/layout/install-prompt';
import { ScreenHeader } from '@/components/layout/screen-header';
import { SectionTitle } from '@/components/shared/section-title';
import { Skeleton } from '@/components/shared/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { settingToggles } from '@/data/settings';
import { appShortcuts } from '@/data/shortcuts';
import { useReminders } from '@/hooks/use-reminders';
import { formatDuration } from '@/lib/format';
import { reminderDefinitions } from '@/lib/reminders';
import { currentStreak, firstSessionDate, lifetimeTotals, weeklyMinutes } from '@/lib/session-stats';
import { useApp } from '@/providers/app-provider';

/** The toggles that need notification permission behind them. */
const reminderIds = new Set(reminderDefinitions.map((entry) => entry.id));


export default function ProfilePage() {
  const { settings, setSetting, sessions, hydrated, name, setName } = useApp();

  // Edited locally and saved on blur or Enter, so the greeting does not flicker
  // through every keystroke.
  const [draftName, setDraftName] = React.useState('');
  React.useEffect(() => setDraftName(name), [name]);
  const { permission, mode: reminderMode, enable, disable } = useReminders();

  /*
   * One line under the list saying what the reminders can and cannot do here.
   *
   * The web case is the one that matters: with no push server behind the app,
   * a browser reminder can only be delivered while Serenity is open. Saying so
   * costs a sentence; letting someone rely on a 07:00 nudge that never arrives
   * costs their morning.
   */
  const reminderNote =
    reminderMode === 'unsupported'
      ? 'This browser cannot show reminders, so the notifications above are unavailable.'
      : permission === 'denied'
        ? 'Notifications are blocked for Serenity. Allow them in your browser or system settings to switch the reminders back on.'
        : reminderMode === 'web'
          ? 'In a browser tab, reminders arrive while Serenity is open. Install it to your home screen for nudges that reach you with the app closed.'
          : null;

  // Resolved on the client: these pages are prerendered, so the build date
  // must not leak into "this week".
  const [today, setToday] = React.useState<Date | null>(null);
  React.useEffect(() => setToday(new Date()), []);

  const week = React.useMemo(
    () => (today ? weeklyMinutes(sessions, today) : []),
    [sessions, today],
  );
  const totals = React.useMemo(() => lifetimeTotals(sessions), [sessions]);
  const startedOn = React.useMemo(() => {
    const first = firstSessionDate(sessions);
    return first
      ? first.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
  }, [sessions]);
  const streak = React.useMemo(
    () => (today ? currentStreak(sessions, today) : 0),
    [sessions, today],
  );

  // Keeps every bar visible in an empty week rather than collapsing the chart.
  const peakMinutes = Math.max(1, ...week.map((day) => day.minutes));
  const ready = hydrated && today !== null;

  const stats = [
    { label: 'Streak', value: ready ? `${streak}d` : '—' },
    { label: 'Mindful', value: ready ? formatDuration(totals.minutes) : '—' },
    { label: 'Sessions', value: ready ? String(totals.sessions) : '—' },
  ];

  return (
    <div className="pb-4">
      {/*
       * There are no accounts: everything here is this phone's own record. The
       * reference showed a made-up member's name and join date, which every
       * reader saw as their own, so this states what is actually known.
       */}
      <ScreenHeader eyebrow="On this phone" title="Profile" />

      <section className="mt-6 flex items-center gap-4 px-5">
        <Avatar className="h-16 w-16">
          <AvatarFallback>
            <User className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[1.125rem] font-bold leading-tight tracking-[-0.01em] text-ink">
            {hydrated && name ? name : 'Your practice'}
          </p>
          <p className="mt-1 text-caption leading-snug text-ink-muted">
            {!hydrated
              ? ' '
              : startedOn
                ? `Practising since ${startedOn}`
                : 'Your first session will start the count'}
          </p>
        </div>
      </section>

      {/* Kept on this phone only; the home screen greets the reader by it. */}
      <section className="mt-5 px-5">
        <label htmlFor="profile-name" className="text-label text-ink-muted">
          What should we call you?
        </label>
        <input
          id="profile-name"
          type="text"
          value={draftName}
          maxLength={40}
          autoComplete="given-name"
          placeholder="Your first name"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => setName(draftName)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="mt-2 h-12 w-full rounded-full border border-overlay/[0.12] bg-overlay/[0.04] px-4 text-body-sm text-ink outline-none placeholder:text-ink-faint focus:border-overlay/30"
        />
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2.5 px-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-tile bg-surface px-2 py-3.5 text-center">
            <p className="whitespace-nowrap text-[1.125rem] font-semibold leading-none tracking-[-0.02em] text-ink">
              {stat.value}
            </p>
            <p className="mt-1.5 text-label leading-none text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <SectionTitle actionHref="/activities" actionLabel="Details">
          This Week
        </SectionTitle>
        {!ready ? (
          <Skeleton className="mt-3 h-[150px]" />
        ) : (
        <div className="mt-3 rounded-tile bg-surface p-4">
          <div className="flex h-[96px] items-end justify-between gap-2">
            {week.map((day) => (
              <div key={day.key} className="flex h-full flex-1 items-end">
                <div
                  role="img"
                  aria-label={`${day.label}: ${day.minutes} mindful minutes`}
                  className="w-full rounded-full bg-[linear-gradient(180deg,#61A644_0%,#61A644_45%,#2FE0CB_100%)]"
                  style={{
                    // A hairline for empty days, so the week still reads as seven.
                    height: day.minutes > 0 ? `${Math.round((day.minutes / peakMinutes) * 100)}%` : '3px',
                    opacity: day.minutes > 0 ? 1 : 0.25,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-2">
            {week.map((day) => (
              <span key={`${day.key}-label`} className="flex-1 text-center text-label text-ink-faint">
                {day.label}
              </span>
            ))}
          </div>
          {totals.sessions === 0 ? (
            <p className="mt-3 text-label leading-relaxed text-ink-faint">
              Nothing logged yet. Finish a session and it appears here.
            </p>
          ) : null}
        </div>
        )}
      </section>

      <section className="mt-6 px-5">
        <SectionTitle>Preferences</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {settingToggles.map((toggle) => {
            const Icon = toggle.icon;
            const stored = settings[toggle.id] ?? toggle.defaultOn;

            // A reminder is only on if it can actually arrive. Permission can be
            // withdrawn in system settings long after the toggle was set, and
            // showing "on" for a notification that will never come is exactly
            // the gap this screen is meant to close.
            const isReminder = reminderIds.has(toggle.id);
            const checked = isReminder ? stored && permission === 'granted' : stored;

            return (
              <li
                key={toggle.id}
                className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
                  <Icon className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`setting-${toggle.id}`}
                    className="block text-body-sm font-medium leading-tight text-ink"
                  >
                    {toggle.label}
                  </label>
                  <p className="mt-0.5 text-label leading-snug text-ink-muted">
                    {toggle.description}
                  </p>
                </div>
                <Switch
                  id={`setting-${toggle.id}`}
                  checked={checked}
                  disabled={isReminder && reminderMode === 'unsupported'}
                  onCheckedChange={(next) => {
                    if (!isReminder) {
                      setSetting(toggle.id, next);
                      return;
                    }
                    if (next) void enable(toggle.id);
                    else disable(toggle.id);
                  }}
                />
              </li>
            );
          })}
        </ul>

        {reminderNote ? (
          <p className="mt-3 px-1 text-label leading-relaxed text-ink-faint">{reminderNote}</p>
        ) : null}
      </section>

      <section className="mt-6 px-5">
        <SectionTitle>This App</SectionTitle>
        <div className="mt-3">
          <InstallPrompt />
        </div>
      </section>

      <section className="mt-6 px-5">
        <SectionTitle>Shortcuts</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {appShortcuts.map(({ href, label, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
                  <Icon className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium leading-tight text-ink">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-label leading-snug text-ink-muted">
                    {description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-ink-faint" strokeWidth={1.8} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
