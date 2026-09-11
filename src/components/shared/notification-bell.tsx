import Link from 'next/link';
import { Bell } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';

/**
 * The bell, shared by the home greeting and the library header so the two
 * cannot drift apart. It opens the notifications screen, where the reminders
 * are switched on and a test can be sent.
 */
export function NotificationBell({ className }: { className?: string }) {
  return (
    <IconButton label="Notifications" asChild className={className}>
      <Link href="/notifications">
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </Link>
    </IconButton>
  );
}
