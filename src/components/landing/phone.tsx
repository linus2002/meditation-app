import Image from 'next/image';

import { cn } from '@/lib/utils';

export type ScreenKey =
  | 'home'
  | 'meditations'
  | 'player'
  | 'kapwa'
  | 'yoga'
  | 'stories'
  | 'story'
  | 'sleep'
  | 'timer'
  | 'program'
  | 'reflections'
  | 'discover';

/** Captured from the app itself in dark mode at 390x804, saved at 660x1361. */
export const screenSrc = (key: ScreenKey) => `/landing/screens/dark/${key}.webp`;

/**
 * One app screen: a status bar over a capture of the real screen, sized so the
 * app's bottom bar lands at the foot of the glass rather than being cropped. Used inside
 * the phone and on its own as the cards that slide past it, so both read as
 * the same surface.
 *
 * Sizes are in container units, so it scales with whatever width it is given.
 */
export function Screen({
  screen,
  priority,
  eager,
  ratio = 390 / 844,
  radius = 12,
  className,
}: {
  screen: ScreenKey;
  priority?: boolean;
  /** Load now rather than on approach: for cards that slide in mid-scroll. */
  eager?: boolean;
  /** Width over height, to match a phone opening that is not the app's own shape. */
  ratio?: number;
  /** Corner radius as a percentage of the width. */
  radius?: number;
  className?: string;
}) {
  return (
    <div className={cn('[container-type:inline-size]', className)}>
      <div
        className="relative flex w-full flex-col overflow-hidden bg-black"
        style={{ aspectRatio: ratio, borderRadius: `${radius}cqw` }}
      >
        <div className="flex h-[11cqw] shrink-0 items-center justify-between px-[8cqw] text-[3.6cqw] font-semibold text-white">
          <span>9:41</span>
          <span className="flex items-center gap-[1.4cqw]" aria-hidden="true">
            <span className="flex items-end gap-[0.6cqw]">
              {[1.4, 2, 2.6, 3.2].map((h) => (
                <span
                  key={h}
                  className="w-[0.8cqw] rounded-full bg-white"
                  style={{ height: `${h}cqw` }}
                />
              ))}
            </span>
            <span className="relative h-[3.2cqw] w-[6.4cqw] rounded-[1cqw] border-[0.35cqw] border-white/70 p-[0.4cqw]">
              <span className="block h-full w-3/4 rounded-[0.5cqw] bg-white" />
            </span>
          </span>
        </div>
        <div className="relative flex-1">
          <Image
            src={screenSrc(screen)}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, 70vw"
            priority={priority}
            loading={priority ? undefined : eager ? 'eager' : 'lazy'}
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A modern handset: titanium band, glass edge, side keys and the island. The
 * screen is either a capture (`screen`) or anything passed as children.
 */
export function Phone({
  screen,
  priority,
  className,
  children,
  label,
}: {
  screen?: ScreenKey;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Describes what the screen shows, for screen readers. */
  label?: string;
}) {
  return (
    <div
      className={cn('[container-type:inline-size]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <div className="relative w-full rounded-[15cqw] bg-[linear-gradient(145deg,#E9EEF2_0%,#9AA6B2_22%,#F4F7FA_46%,#7E8B98_74%,#D7DEE4_100%)] p-[0.9cqw] shadow-[0_40px_80px_-30px_rgba(11,27,43,0.45),0_12px_30px_-12px_rgba(11,27,43,0.25)]">
        {/* Side keys */}
        <span className="absolute -left-[0.9cqw] top-[22%] h-[7%] w-[1.2cqw] rounded-l-full bg-[#A9B4BF]" />
        <span className="absolute -left-[0.9cqw] top-[31%] h-[11%] w-[1.2cqw] rounded-l-full bg-[#A9B4BF]" />
        <span className="absolute -right-[0.9cqw] top-[27%] h-[15%] w-[1.2cqw] rounded-r-full bg-[#A9B4BF]" />
        <div className="relative rounded-[14.2cqw] bg-[#05080C] p-[2.4cqw]">
          {children ? (
            <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[12cqw] bg-black">
              {children}
            </div>
          ) : (
            screen && <Screen screen={screen} priority={priority} />
          )}
          {/* The island */}
          <span className="absolute left-1/2 top-[4.2cqw] h-[7.6cqw] w-[27cqw] -translate-x-1/2 rounded-full bg-black" />
          {/* Glass sheen */}
          <span className="pointer-events-none absolute inset-[2.4cqw] rounded-[12cqw] bg-[linear-gradient(115deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0)_72%,rgba(255,255,255,0.12)_100%)]" />
        </div>
      </div>
    </div>
  );
}
