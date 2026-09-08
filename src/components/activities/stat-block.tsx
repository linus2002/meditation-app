import { cn } from '@/lib/utils';

interface StatBlockProps {
  label: string;
  value: string;
  /** Rendered smaller and muted directly after the value, e.g. "/500". */
  suffix?: string;
  /** `hero` is the oversized calorie figure; `time` matches the clock readouts. */
  size?: 'hero' | 'time';
  className?: string;
}

/**
 * A muted label above a large figure — the pattern used three times down the
 * right-hand side of the activities screen.
 */
export function StatBlock({ label, value, suffix, size = 'time', className }: StatBlockProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-[clamp(10px,3.1vw,12px)] font-normal leading-none text-ink-muted">
        {label}
      </span>
      <span className="mt-1.5 flex items-baseline">
        <span
          className={cn(
            'leading-none tracking-[-0.02em] text-ink',
            size === 'hero'
              ? 'text-[clamp(32px,11.5vw,50px)] font-bold'
              : 'text-[clamp(20px,6.8vw,28px)] font-light',
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span className="text-[clamp(12px,4.4vw,18px)] font-normal leading-none text-ink-muted">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  );
}
