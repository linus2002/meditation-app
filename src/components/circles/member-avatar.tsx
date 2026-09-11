import { User } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A member as a small round mark: the first letter of the name they chose, or
 * a plain figure if they chose none. No invented initials, no photos.
 */
export function MemberAvatar({ name, className }: { name: string | null; className?: string }) {
  const initial = name ? Array.from(name.trim())[0]?.toUpperCase() : undefined;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-overlay/[0.1] text-[12px] font-semibold text-ink-soft ring-2 ring-canvas',
        className,
      )}
    >
      {initial ?? <User className="h-3.5 w-3.5" strokeWidth={1.8} />}
    </span>
  );
}
