'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { NotificationBell } from '@/components/shared/notification-bell';

interface GreetingHeaderProps {
  firstName: string;
}

/**
 * "Hello, Sherman" on the left with the two bare icon controls on the right,
 * matching the top of the home screen in the reference.
 *
 * Pinned to the top of the scrolling region, so the greeting and the two
 * controls stay reachable as the page moves. It carries a solid canvas fill
 * and no edge treatment beneath it, so it sits flat against the page.
 *
 * The top padding clears the status bar on notched devices and otherwise sits
 * close to the top edge.
 */
export function GreetingHeader({ firstName }: GreetingHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
      <div className="pt-0.5">
        <p className="text-[clamp(13px,3.85vw,15px)] font-normal leading-[1.15] text-ink-soft">Hello,</p>
        <p className="text-[clamp(18px,5.4vw,21px)] font-medium leading-[1.15] tracking-[-0.01em] text-ink">
          {firstName}
        </p>
      </div>

      <div className="-mr-2 flex items-center gap-0.5">
        <NotificationBell />
        <IconButton label="Search sessions" asChild>
          <Link href="/discover">
            <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </Link>
        </IconButton>
      </div>
    </header>
  );
}
