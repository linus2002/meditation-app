'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';

import { IconButton } from '@/components/shared/icon-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const notifications = [
  { id: 'streak', title: 'Twelve day streak', body: 'You have shown up every morning this month.' },
  { id: 'goal', title: 'Daily goal ready', body: 'Meditation, 30 minutes, whenever you are.' },
  { id: 'sleep', title: 'Sleep report is in', body: 'Last night averaged 7h 24m with deep rest at 25%.' },
];

/**
 * The bell and its sheet, shared by the home greeting and the library header
 * so the two cannot drift apart or show different notifications.
 */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton label="Notifications" onClick={() => setOpen(true)} className={className}>
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </IconButton>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[70%] border-white/10">
          <SheetHeader className="pb-2">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Three updates from the last day.</SheetDescription>
          </SheetHeader>
          <ul className="space-y-2 px-6 pb-8">
            {notifications.map((item) => (
              <li key={item.id} className="rounded-tile bg-white/[0.05] px-4 py-3">
                <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
