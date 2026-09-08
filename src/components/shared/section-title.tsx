import Link from 'next/link';

import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: React.ReactNode;
  /** Optional trailing link, styled to stay quieter than the title. */
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

/** Matches the "What Brings You Today ?" row weight and colour. */
export function SectionTitle({ children, actionHref, actionLabel, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <h2 className="text-[15px] font-medium leading-none text-ink-soft">{children}</h2>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="text-[12px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
