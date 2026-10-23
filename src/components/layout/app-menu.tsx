'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Menu, Settings2, User } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { appShortcuts, type Shortcut } from '@/data/shortcuts';
import { useApp } from '@/providers/app-provider';

function MenuRow({ href, label, description, icon: Icon }: Shortcut) {
  return (
    <li>
      <SheetClose asChild>
        <Link
          href={href}
          className="flex items-center gap-4 rounded-tile px-2 py-2.5 transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <Icon className="h-5 w-5 shrink-0 text-ink-soft" strokeWidth={1.7} />
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium leading-tight text-ink">{label}</span>
            <span className="mt-0.5 block truncate text-label leading-snug text-ink-muted">
              {description}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
        </Link>
      </SheetClose>
    </li>
  );
}

/**
 * The menu behind the three lines in the home header: who you are at the top,
 * then every screen without a tab of its own, each with a line saying what is
 * there. It slides in from the left across the whole screen and closes as
 * soon as a row is chosen.
 */
export function AppMenu() {
  const { name, hydrated } = useApp();
  const shownName = hydrated && name ? name : null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton label="Open menu" className="-ml-2.5">
          <Menu className="h-[22px] w-[22px]" strokeWidth={1.7} />
        </IconButton>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-full max-w-none flex-col sm:max-w-none overflow-y-auto border-none bg-canvas px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+20px)]"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Every screen in Serenity</SheetDescription>

        {/* Who you are, leading to Profile. */}
        <SheetClose asChild>
          <Link
            href="/profile"
            className="mr-8 flex items-center gap-3 rounded-tile px-2 py-2 transition-colors hover:bg-overlay/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <Avatar className="h-11 w-11">
              <AvatarFallback>
                {shownName ? (
                  shownName.charAt(0).toUpperCase()
                ) : (
                  <User className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                )}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-[1.0625rem] font-semibold leading-tight text-ink">
                {shownName ?? 'Your practice'}
              </span>
              <span className="mt-0.5 block text-label text-ink-muted">View profile</span>
            </span>
          </Link>
        </SheetClose>

        <div aria-hidden="true" className="hairline my-4 h-px w-full" />

        <p className="px-2 text-label font-medium text-ink-faint">Explore</p>
        <ul className="mt-2 space-y-0.5">
          {appShortcuts.map((shortcut) => (
            <MenuRow key={shortcut.href} {...shortcut} />
          ))}
        </ul>

        <div aria-hidden="true" className="hairline my-4 h-px w-full" />

        <ul>
          <MenuRow
            href="/profile"
            label="Profile and preferences"
            description="Your progress, light mode, reminders and sounds"
            icon={Settings2}
          />
        </ul>
      </SheetContent>
    </Sheet>
  );
}
