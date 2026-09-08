import { cn } from '@/lib/utils';

/**
 * The Serenity wordmark: the breathing ring from the app icon, set beside the
 * name. Occupies the same slot as the logo in the reference layout.
 */
export function SerenityMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <span className="text-[clamp(34px,10.5vw,44px)] font-bold leading-none tracking-[-0.03em] text-ink">
        Serenity
      </span>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="h-[clamp(26px,8vw,34px)] w-[clamp(26px,8vw,34px)] shrink-0"
      >
        <defs>
          <linearGradient id="mark-ring" x1="18%" y1="8%" x2="82%" y2="92%">
            <stop offset="0%" stopColor="#F48FC8" />
            <stop offset="38%" stopColor="#B98CEE" />
            <stop offset="66%" stopColor="#7C7BF0" />
            <stop offset="100%" stopColor="#2FE0CB" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="14" fill="none" stroke="url(#mark-ring)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
