'use client';

import { usePathname } from 'next/navigation';
import { ChevronsLeft } from 'lucide-react';

import { isTabRoot, useBack } from '@/hooks/use-back';
import { cn } from '@/lib/utils';

interface ScreenHeaderProps {
  /** Small muted line above the title, e.g. "March, 2023". */
  eyebrow?: string;
  title: string;
  /** Optional slot rendered on the right, opposite the back control. */
  action?: React.ReactNode;
  className?: string;
  /** Where Back goes when this screen was the first one opened (a reminder, a link). */
  fallbackHref?: string;
}

/**
 * The header from the activities screen: a double-chevron back control on the
 * left, sitting slightly above a centred eyebrow and title stack.
 *
 * The bottom-bar tabs (Kapwa, Yoga, Sleep) get no back control: like Home and
 * Meditations they are where you go, not somewhere to go back from, and the
 * control there disagreed with Android's Back, which goes home from a tab.
 */
export function ScreenHeader({ eyebrow, title, action, className, fallbackHref }: ScreenHeaderProps) {
  const goBack = useBack(fallbackHref);
  const onTab = isTabRoot(usePathname());

  return (
    <header className={cn('relative px-4 pt-[calc(var(--header-gap)-1px)]', className)}>
      <div className="grid grid-cols-[36px_1fr_36px] items-start gap-2">
        {onTab ? (
          <span aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="-mt-1.5 tap-target flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            <ChevronsLeft className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </button>
        )}

        <div className="flex min-w-0 flex-col items-center gap-[5px] text-center">
          {eyebrow ? (
            // One line, always: a long eyebrow is cut short rather than pushing the title down.
            <p className="max-w-full truncate text-[clamp(0.75rem,3.1vw,0.8125rem)] font-normal leading-none text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[clamp(1rem,4.8vw,1.1875rem)] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h1>
        </div>

        <div className="flex justify-end">{action}</div>
      </div>
    </header>
  );
}
