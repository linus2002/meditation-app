import Image from 'next/image';
import Link from 'next/link';

import { photos } from '@/data/images';

/**
 * The meditation group banner that closes the home screen.
 *
 * The artwork carries its own headline and lockup, so nothing is laid over it
 * but the call to action — and the aspect ratio is held to the source image so
 * "Grow. Breathe. Become." is never cropped at narrow widths.
 *
 * The button is styled against the picture rather than against the app palette:
 * it sits on the sitter's pale lavender sleeve in both themes, so a themed fill
 * would read well in one and vanish in the other.
 */
export function GroupBanner({ href = '/circles' }: { href?: string }) {
  return (
    <div className="relative overflow-hidden rounded-tile">
      <Image
        src={photos.groupBanner}
        alt="Meditation Group — grow, breathe, become."
        sizes="(max-width: 430px) 100vw, 430px"
        placeholder="blur"
        className="h-auto w-full"
      />

      <Link
        href={href}
        className="absolute bottom-4 right-4 rounded-full bg-[#3B1E6E] px-6 py-3 text-[13.5px] font-semibold leading-none text-white shadow-[0_10px_24px_-8px_rgba(24,8,54,0.65)] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#A98BD8]"
      >
        Join Now
      </Link>
    </div>
  );
}
