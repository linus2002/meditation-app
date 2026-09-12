'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import { toDateKey } from '@/lib/date';
import { lastSeenInspiration } from '@/lib/inspiration-seen';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

/**
 * The bell, shared by the home greeting and the library header so the two
 * cannot drift apart. It opens the notifications screen.
 *
 * A small dot marks a new daily inspiration not yet read — only for readers
 * who switched the inspiration on, so nobody else gets a daily badge.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { settings, hydrated } = useApp();
  const [fresh, setFresh] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated || !settings.inspiration) {
      setFresh(false);
      return;
    }
    setFresh(lastSeenInspiration() !== toDateKey(new Date()));
  }, [hydrated, settings.inspiration]);

  return (
    <IconButton
      label={fresh ? 'Notifications, new daily inspiration' : 'Notifications'}
      asChild
      className={cn('relative', className)}
    >
      <Link href="/notifications">
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
        {fresh ? (
          <span
            aria-hidden="true"
            className="absolute right-[11px] top-[11px] h-2 w-2 rounded-full bg-action-pill ring-2 ring-canvas"
          />
        ) : null}
      </Link>
    </IconButton>
  );
}
