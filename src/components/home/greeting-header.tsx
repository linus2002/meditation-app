'use client';

import * as React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';

import { SearchBarLink } from '@/components/search/search-bar-link';
import { AppMenu } from '@/components/layout/app-menu';
import { NotificationBell } from '@/components/shared/notification-bell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { timeOfDayGreeting } from '@/lib/greeting';
import { useApp } from '@/providers/app-provider';

/**
 * The top of the home screen: the menu on the left, the Reflect button, the
 * notification bell and the profile avatar on the right (Profile's only way in now that the bottom bar holds
 * Yoga instead), a large greeting, and a search bar beneath it. Serenity has no accounts, so the
 * greeting uses the name the reader gave on Profile, kept on this phone, and
 * leaves it out until they give one.
 *
 * The greeting is filled in on the device: the page is prerendered, and the
 * build's own hour must not leak into it.
 *
 * The search bar is a link to the search screen, which owns the real field.
 *
 * The top padding clears the status bar on notched devices and otherwise sits
 * close to the top edge.
 */
export function GreetingHeader() {
  const { name, hydrated } = useApp();
  const firstName = name.split(/\s+/)[0] ?? '';
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);

  return (
    <header className="px-5 pt-[calc(var(--header-gap)-11px)]">
      <div className="flex items-center justify-between">
        <AppMenu />
        <div className="-mr-1 flex items-center gap-1.5">
          {/* The day's reflection, one tap from the top of the app. */}
          <Link
            href="/reflections"
            className="mr-1 flex h-8 items-center rounded-md bg-aurora-blue px-3.5 text-caption font-semibold leading-none text-white transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Reflect
          </Link>
          <NotificationBell />
          <Link
            href="/profile"
            aria-label="Profile"
            className="tap-target rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Avatar className="h-8 w-8">
              {/* The reader's initial once they have given a name, a figure until then. */}
              <AvatarFallback className="text-[0.8125rem]">
                {hydrated && name ? (
                  name.charAt(0).toUpperCase()
                ) : (
                  <User className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                )}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      {/*
       * Always two lines: the greeting with the reader's first name, then the
       * invitation. A long name is cut short rather than pushing onto a third.
       */}
      <h1 className="mt-3 text-[clamp(1.25rem,5.8vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
        <span className="block truncate">
          {now ? timeOfDayGreeting(now.getHours()) : 'Hello'}
          {hydrated && firstName ? `, ${firstName}` : ','}
        </span>
        <span className="block truncate text-ink-muted">take a slow breath</span>
      </h1>

      <SearchBarLink className="mt-5" />
    </header>
  );
}
