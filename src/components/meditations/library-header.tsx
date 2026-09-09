'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { NotificationBell } from '@/components/shared/notification-bell';

/**
 * The library's top bar: search and notifications, right aligned. Pinned, so
 * the controls stay reachable while the long list of content scrolls under
 * them. The account lives on its own tab in the bottom nav, so nothing points
 * at it from here.
 */
export function LibraryHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-end bg-canvas px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
      <div className="-mr-2 flex items-center gap-0.5">
        <IconButton label="Search sessions" asChild>
          <Link href="/discover">
            <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </Link>
        </IconButton>
        <NotificationBell />
      </div>
    </header>
  );
}
