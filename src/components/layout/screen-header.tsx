'use client';

import { useRouter } from 'next/navigation';
import { ChevronsLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ScreenHeaderProps {
  /** Small muted line above the title, e.g. "March, 2023". */
  eyebrow?: string;
  title: string;
  /** Optional slot rendered on the right, opposite the back control. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The header from the activities screen: a double-chevron back control on the
 * left, sitting slightly above a centred eyebrow and title stack.
 */
export function ScreenHeader({ eyebrow, title, action, className }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <header className={cn('relative px-4 pt-[clamp(20px,5.7vh,48px)]', className)}>
      <div className="grid grid-cols-[36px_1fr_36px] items-start gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="-mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <ChevronsLeft className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </button>

        <div className="flex flex-col items-center gap-[5px] text-center">
          {eyebrow ? (
            <p className="text-[clamp(11px,3.1vw,12px)] font-normal leading-none text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[clamp(16px,4.8vw,19px)] font-medium leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h1>
        </div>

        <div className="flex justify-end">{action}</div>
      </div>
    </header>
  );
}
