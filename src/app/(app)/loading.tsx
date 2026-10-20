import { Skeleton, SkeletonList } from '@/components/shared/skeleton';

/**
 * Shown the instant a bottom-bar tab is tapped, while the next screen loads.
 *
 * Without it the old screen stays frozen until the new route is ready, which
 * reads as a dead tap. The layout (and so the bottom nav) stays mounted around
 * this, so only the page area swaps.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="px-5 pb-4 pt-[var(--header-gap)]">
      <Skeleton className="mx-auto h-[14px] w-24" />
      <Skeleton className="mx-auto mt-2 h-[26px] w-44" />
      <Skeleton className="mt-8 h-[180px]" />
      <SkeletonList count={4} className="mt-6" />
    </div>
  );
}
