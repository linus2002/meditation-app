'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Search } from 'lucide-react';

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
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
      <div className="pt-0.5">
        <p className="text-[clamp(13px,3.85vw,15px)] font-normal leading-[1.15] text-ink-soft">Hello,</p>
        <p className="text-[clamp(18px,5.4vw,21px)] font-medium leading-[1.15] tracking-[-0.01em] text-ink">
          {firstName}
        </p>
      </div>

      <div className="-mr-2 flex items-center gap-0.5">
        <IconButton label="Notifications" onClick={() => setOpen(true)}>
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </IconButton>
        <IconButton label="Search sessions" asChild>
          <Link href="/discover">
            <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </Link>
        </IconButton>
      </div>

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
    </header>
  );
}
