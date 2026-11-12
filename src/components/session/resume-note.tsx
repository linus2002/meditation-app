import { cn } from '@/lib/utils';

/**
 * "Picking up at 1:00", with a way to start over instead. Shown on opening a
 * session that was left part-way, until it is running again.
 */
export function ResumeNote({
  label,
  onStartOver,
  className,
}: {
  /** What comes after "Picking up at": a time, or a place such as "pose 3". */
  label: string;
  onStartOver: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-overlay/[0.06] py-1 pl-4 pr-1',
        className,
      )}
    >
      <p className="text-body-sm text-ink-soft">Picking up at {label}</p>
      <button
        type="button"
        onClick={onStartOver}
        className="h-11 rounded-xl px-3 text-body-sm font-medium text-ink transition-colors hover:bg-overlay/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        Start from the beginning
      </button>
    </div>
  );
}
