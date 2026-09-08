'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Flame, Heart, Timer, TimerReset } from 'lucide-react';

import { InstallPrompt } from '@/components/layout/install-prompt';
import { ScreenHeader } from '@/components/layout/screen-header';
import { SectionTitle } from '@/components/shared/section-title';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { settingToggles } from '@/data/settings';
import { currentUser } from '@/data/user';
import { formatDuration } from '@/lib/format';
import { currentStreak, lifetimeTotals, weeklyMinutes } from '@/lib/session-stats';
import { useApp } from '@/providers/app-provider';

const shortcuts = [
  { href: '/timer', label: 'Unguided timer', icon: TimerReset },
  { href: '/stories', label: 'Read-aloud stories', icon: BookOpen },
  { href: '/favorites', label: 'Saved sessions', icon: Heart },
  { href: '/activities', label: 'Daily activities', icon: Flame },
  { href: '/sleep', label: 'Sleep and timers', icon: Timer },
];

export default function ProfilePage() {
  const { settings, setSetting, sessions, hydrated } = useApp();

  // Resolved on the client: these pages are prerendered, so the build date
  // must not leak into "this week".
  const [today, setToday] = React.useState<Date | null>(null);
  React.useEffect(() => setToday(new Date()), []);

  const week = React.useMemo(
    () => (today ? weeklyMinutes(sessions, today) : []),
    [sessions, today],
  );
  const totals = React.useMemo(() => lifetimeTotals(sessions), [sessions]);
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
      <ScreenHeader eyebrow="Your account" title="Profile" />

      <section className="mt-6 flex items-center gap-4 px-5">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-[18px]">{currentUser.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[18px] font-bold leading-tight tracking-[-0.01em] text-ink">
            {`${currentUser.firstName} ${currentUser.lastName}`}
          </p>
          <p className="mt-1 text-[12px] leading-none text-ink-muted">
            Member since {currentUser.memberSince}
          </p>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2.5 px-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-tile bg-[#141733] px-2 py-3.5 text-center">
            <p className="whitespace-nowrap text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[11px] leading-none text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <SectionTitle actionHref="/activities" actionLabel="Details">
          This Week
        </SectionTitle>
        <div className="mt-3 rounded-tile bg-[#141733] p-4">
          <div className="flex h-[96px] items-end justify-between gap-2">
            {week.map((day) => (
              <div key={day.key} className="flex h-full flex-1 items-end">
                <div
                  role="img"
                  aria-label={`${day.label}: ${day.minutes} mindful minutes`}
                  className="w-full rounded-full bg-[linear-gradient(180deg,#B96BF0_0%,#8A7AF2_45%,#2FE0CB_100%)]"
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
              <span key={`${day.key}-label`} className="flex-1 text-center text-[10px] text-ink-faint">
                {day.label}
              </span>
            ))}
          </div>
          {ready && totals.sessions === 0 ? (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Nothing logged yet. Finish a session and it appears here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-5">
        <SectionTitle>Preferences</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {settingToggles.map((toggle) => {
            const Icon = toggle.icon;
            const checked = settings[toggle.id] ?? toggle.defaultOn;
            return (
              <li
                key={toggle.id}
                className="flex items-center gap-3.5 rounded-tile bg-[#141733] px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                  <Icon className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`setting-${toggle.id}`}
                    className="block text-[13.5px] font-medium leading-tight text-ink"
                  >
                    {toggle.label}
                  </label>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                    {toggle.description}
                  </p>
                </div>
                <Switch
                  id={`setting-${toggle.id}`}
                  checked={checked}
                  onCheckedChange={(next) => setSetting(toggle.id, next)}
                />
              </li>
            );
          })}
        </ul>
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
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3.5 rounded-tile bg-[#141733] px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                  <Icon className="h-[17px] w-[17px] text-ink-soft" strokeWidth={1.7} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium text-ink">{label}</span>
                <ChevronRight className="h-4 w-4 text-ink-faint" strokeWidth={1.8} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
