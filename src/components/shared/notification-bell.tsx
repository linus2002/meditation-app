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

/*
 * Prompts, not reports. Nothing here quotes a figure back at the reader: the
 * app has no scheduler behind these yet, and a "12 day streak" or a deep-sleep
 * percentage that was written at build time is exactly the kind of invented
 * number the activities and sleep screens were cleaned up to stop showing.
 */
const notifications = [
  { id: 'goal', title: 'Today is waiting', body: 'Thirty minutes, whenever you are ready.' },
  { id: 'sleep', title: 'Log last night', body: 'Add bedtime and wake time to fill in your week.' },
  { id: 'reflect', title: "Today's reflection", body: 'One question, one sentence, whenever it suits.' },
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
        <SheetContent side="bottom" className="max-h-[70%] border-overlay/10">
          <SheetHeader className="pb-2">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Three updates from the last day.</SheetDescription>
          </SheetHeader>
          <ul className="space-y-2 px-6 pb-8">
            {notifications.map((item) => (
              <li key={item.id} className="rounded-tile bg-overlay/[0.05] px-4 py-3">
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
