import Link from 'next/link';

import { cn } from '@/lib/utils';

interface HomeSectionProps {
  title: string;
  /** Optional line under the heading; omitted where the rail speaks for itself. */
  description?: string;
  /** Optional quiet link opposite the heading, e.g. "See all". */
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Heading, optional standfirst and a full-bleed slot for the rail beneath it.
 *
 * The home rails share this so their headings stay locked to one another; the
 * rail itself keeps its own horizontal padding, since it bleeds off-screen.
 */
export function HomeSection({
  title,
  description,
  actionHref,
  actionLabel,
  className,
  children,
}: HomeSectionProps) {
  return (
    <section className={cn('pt-7', className)}>
      <div className="px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[clamp(1.0625rem,4.8vw,1.25rem)] font-medium leading-tight tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="tap-target shrink-0 text-caption font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1.5 text-body-sm leading-[1.45] text-ink-muted">{description}</p>
        ) : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}
