import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A chat's message box, held at the bottom of the screen just above the tab
 * bar (as messaging apps do) however few messages there are.
 *
 * The chat screen must be a column that fills the page (`flex flex-1 flex-col`):
 * `mt-auto` takes the dock to its foot, and `sticky` keeps it there while a long
 * conversation scrolls behind it. --nav-h is the tab bar's height, written by
 * BottomNav. The bottom padding leaves room for the Kapwa button, which rises
 * above the bar, and `-mb-7` cancels the page's own allowance for it (AppLayout).
 */
export function ChatDock({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-[var(--nav-h,76px)] z-10 -mb-7 mt-auto bg-canvas px-4 pb-7 pt-3',
        // A short fade above it, so messages slip under rather than being cut off.
        'before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:h-5 before:bg-gradient-to-t before:from-canvas before:to-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Where a chat scrolls to for its newest message: the margin keeps that message
 * clear of the dock and the tab bar instead of tucked under them.
 */
export const CHAT_END_CLASS = 'scroll-mb-[calc(var(--nav-h,76px)+10rem)]';
