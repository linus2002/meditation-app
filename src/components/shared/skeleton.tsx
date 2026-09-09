import { cn } from '@/lib/utils';

/**
 * The loading placeholder used across the app.
 *
 * Almost everything the app shows is derived from localStorage, which cannot be
 * read until after hydration — so most screens have a real moment where the
 * numbers are not knowable yet. A skeleton is the honest thing to show then:
 * rendering zeros would state a figure the app has not read, and rendering
 * nothing collapses the layout and then shoves it back open.
 *
 * Give it the height of whatever it stands in for. Matching that height is the
 * whole job — a placeholder of the wrong size still causes the jump it exists
 * to prevent.
 *
 * `aria-hidden` throughout: a screen reader should hear the finished content,
 * not a description of grey boxes. Wrap the region in `aria-busy` if the wait
 * needs announcing. The pulse is already stilled for anyone who asks for
 * reduced motion, by the global rule in `globals.css`.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-tile bg-overlay/[0.05]', className)}
    />
  );
}

interface SkeletonListProps {
  /** How many rows to stand in for. Keep it near the usual result count. */
  count?: number;
  /** Height of one row, matching the card it replaces. */
  itemClassName?: string;
  className?: string;
}

/** A stack of rows, for the card lists that fill in after hydration. */
export function SkeletonList({
  count = 3,
  itemClassName = 'h-[80px]',
  className,
}: SkeletonListProps) {
  return (
    <ul aria-hidden="true" className={cn('space-y-2.5', className)}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className={itemClassName} />
        </li>
      ))}
    </ul>
  );
}
