import Image from 'next/image';

// Trimmed and squared from `kapwaicon.png` (the 1 MB original), so the mark
// fills its box the same way the ring it replaced did.
import kapwaIcon from '@/assets/images/kapwaicon-256.png';
import { cn } from '@/lib/utils';

/** Kapwa's mark: the bottom-bar button, the chat header and Kapwa's replies. */
export function KapwaIcon({ className }: { className?: string }) {
  return (
    <Image
      src={kapwaIcon}
      alt=""
      aria-hidden="true"
      sizes="64px"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
