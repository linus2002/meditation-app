import Image from 'next/image';

// Cleaned and squared from `logoapp.png` (the original, with its cut-out halo).
// Regenerate both together if the logo changes; the app icons come from it too.
import logo from '@/assets/images/logoapp-512.png';
import { cn } from '@/lib/utils';

/**
 * The app's logo mark on its own: the blue and green leaves. Shared so the
 * wordmark and anywhere else the mark appears draw the same artwork.
 */
export function SerenityLogo({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      sizes="128px"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}

/**
 * The Serenity wordmark: the logo set beside the name. Occupies the same slot
 * as the logo in the reference layout.
 */
export function SerenityMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <span className="text-[clamp(1.625rem,8.2vw,2.0625rem)] font-semibold leading-none tracking-[-0.02em] text-ink">
        Serenity
      </span>
      <SerenityLogo className="h-[clamp(22px,6.8vw,28px)] w-[clamp(22px,6.8vw,28px)]" />
    </div>
  );
}
