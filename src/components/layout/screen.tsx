import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Column wrapper that owns the full height of the device frame. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('relative flex h-full min-h-0 flex-col', className)}>{children}</div>;
}

/** The single scrolling region of a screen. Everything else stays pinned. */
export function ScreenBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rail min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}>
      {children}
    </div>
  );
}
